-- 講師が書くコラムと、コラムを整理するフォルダ。
-- 書けるのはプロフィール編集が有効な講師本人だけ。公開されたコラムは、公開中の講師のものだけ誰でも読める。

create table if not exists public.teacher_column_folders (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_columns (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references public.user_profiles(id) on delete cascade,
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  folder_id uuid references public.teacher_column_folders(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null default '',
  image_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_columns_teacher_idx on public.teacher_columns (teacher_user_id, position);
create index if not exists teacher_columns_published_idx on public.teacher_columns (is_published, published_at desc);
create index if not exists teacher_column_folders_teacher_idx on public.teacher_column_folders (teacher_user_id, position);

drop trigger if exists set_teacher_column_folders_updated_at on public.teacher_column_folders;
create trigger set_teacher_column_folders_updated_at before update on public.teacher_column_folders
for each row execute function public.set_updated_at();
drop trigger if exists set_teacher_columns_updated_at on public.teacher_columns;
create trigger set_teacher_columns_updated_at before update on public.teacher_columns
for each row execute function public.set_updated_at();

-- コラムの持ち主・フォルダ・画像の置き場所が本人のものであることを確かめ、公開日時を記録する。
create or replace function public.validate_teacher_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teacher_profiles where id = new.teacher_profile_id and user_id = new.teacher_user_id) then
    raise exception 'コラムの講師情報が一致しません';
  end if;
  if new.folder_id is not null and not exists (select 1 from public.teacher_column_folders where id = new.folder_id and teacher_user_id = new.teacher_user_id) then
    raise exception '自分のフォルダにだけ移動できます';
  end if;
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.teacher_user_id::text then
    raise exception '画像の保存場所が正しくありません';
  end if;
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists validate_teacher_column on public.teacher_columns;
create trigger validate_teacher_column before insert or update on public.teacher_columns
for each row execute function public.validate_teacher_column();

alter table public.teacher_column_folders enable row level security;
alter table public.teacher_columns enable row level security;

drop policy if exists "Teachers manage their own column folders" on public.teacher_column_folders;
create policy "Teachers manage their own column folders" on public.teacher_column_folders
for all to authenticated
using (teacher_user_id = auth.uid())
with check (teacher_user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid()));

drop policy if exists "Public can read folders of public teachers" on public.teacher_column_folders;
create policy "Public can read folders of public teachers" on public.teacher_column_folders
for select to anon, authenticated
using (public.is_public_teacher(teacher_user_id));

drop policy if exists "Teachers manage their own columns" on public.teacher_columns;
create policy "Teachers manage their own columns" on public.teacher_columns
for all to authenticated
using (teacher_user_id = auth.uid())
with check (teacher_user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid()));

drop policy if exists "Public can read published columns of public teachers" on public.teacher_columns;
create policy "Public can read published columns of public teachers" on public.teacher_columns
for select to anon, authenticated
using (is_published and public.is_public_teacher(teacher_user_id));

-- コラムの写真：誰でも見られる。書き込めるのは講師本人のフォルダだけ。5MBまでの画像のみ。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('column-images', 'column-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Teachers upload their own column images" on storage.objects;
create policy "Teachers upload their own column images" on storage.objects
for insert to authenticated
with check (bucket_id = 'column-images' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher_profile_enabled(auth.uid()));

drop policy if exists "Teachers delete their own column images" on storage.objects;
create policy "Teachers delete their own column images" on storage.objects
for delete to authenticated
using (bucket_id = 'column-images' and (storage.foldername(name))[1] = auth.uid()::text);

grant select on public.teacher_column_folders, public.teacher_columns to anon;
grant select, insert, update, delete on public.teacher_column_folders, public.teacher_columns to authenticated;
