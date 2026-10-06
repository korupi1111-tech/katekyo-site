-- 講師プロフィールの保存基盤。
-- ランク・授業数・一致率は講師本人が変更できない別テーブルに分離する。

create extension if not exists pgcrypto;

create type public.account_role as enum ('student', 'guardian', 'teacher', 'admin');
create type public.teacher_rank as enum ('R', 'SR', 'SSR', 'UR', 'LR', 'KING', 'OMEGA');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'student',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  public_slug text not null unique check (public_slug ~ '^[a-z0-9-]{3,80}$'),
  is_published boolean not null default false,
  avatar_path text,
  display_name text not null check (char_length(display_name) between 1 and 80),
  catchphrase text not null check (char_length(catchphrase) between 1 and 160),
  education text,
  teaching_experience text,
  qualifications text[] not null default '{}',
  mock_exam_result text,
  gender text,
  lesson_format text,
  contact_method text,
  recruitment_status text,
  recruitment_detail text,
  price_yen integer check (price_yen is null or price_yen >= 0),
  main_subject text,
  strengths text[] not null default '{}',
  limitations text[] not null default '{}',
  target_students text[] not null default '{}',
  teaching_policy text,
  teaching_types text[] not null default '{}',
  other_subjects text[] not null default '{}',
  extra_subjects text[] not null default '{}',
  lesson_format_detail text,
  recommended_for text[] not null default '{}',
  not_recommended_for text[] not null default '{}',
  homework_policy text,
  unsupported_content text,
  teacher_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_metrics (
  teacher_profile_id uuid primary key references public.teacher_profiles(id) on delete cascade,
  current_rank public.teacher_rank not null default 'R',
  highest_rank public.teacher_rank not null default 'R',
  season_lessons integer not null default 0 check (season_lessons >= 0),
  total_lessons integer not null default 0 check (total_lessons >= 0),
  profile_match_rate numeric(5,2) check (profile_match_rate is null or profile_match_rate between 0 and 100),
  updated_at timestamptz not null default now()
);

-- 証憑ファイルは private bucket に置き、確認済みフラグは本人が変更できない。
create table public.teacher_verifications (
  teacher_profile_id uuid primary key references public.teacher_profiles(id) on delete cascade,
  education_verified boolean not null default false,
  qualifications_verified boolean not null default false,
  mock_exam_verified boolean not null default false,
  education_document_path text,
  qualifications_document_path text,
  mock_exam_document_path text,
  verified_at timestamptz,
  verified_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

create index teacher_profiles_published_idx on public.teacher_profiles (is_published, main_subject);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger set_teacher_profiles_updated_at
before update on public.teacher_profiles
for each row execute function public.set_updated_at();

create trigger set_teacher_metrics_updated_at
before update on public.teacher_metrics
for each row execute function public.set_updated_at();

create trigger set_teacher_verifications_updated_at
before update on public.teacher_verifications
for each row execute function public.set_updated_at();

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_user_profile();

create or replace function public.create_teacher_profile_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles set role = 'teacher' where id = new.user_id;
  insert into public.teacher_metrics (teacher_profile_id) values (new.id);
  insert into public.teacher_verifications (teacher_profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_teacher_profile_created
after insert on public.teacher_profiles
for each row execute function public.create_teacher_profile_records();

alter table public.user_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_metrics enable row level security;
alter table public.teacher_verifications enable row level security;

create policy "Users can read their own account profile"
on public.user_profiles for select to authenticated
using (id = auth.uid());

create policy "Teachers can read their own profile"
on public.teacher_profiles for select to authenticated
using (user_id = auth.uid());

create policy "Published teacher profiles are publicly visible"
on public.teacher_profiles for select to anon, authenticated
using (is_published = true);

create policy "Teachers can create their own profile"
on public.teacher_profiles for insert to authenticated
with check (user_id = auth.uid());

create policy "Teachers can update their own profile"
on public.teacher_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Published metrics are publicly visible"
on public.teacher_metrics for select to anon, authenticated
using (exists (
  select 1 from public.teacher_profiles p
  where p.id = teacher_profile_id and p.is_published = true
));

create policy "Teachers can read their own metrics"
on public.teacher_metrics for select to authenticated
using (exists (
  select 1 from public.teacher_profiles p
  where p.id = teacher_profile_id and p.user_id = auth.uid()
));

create policy "Teachers can read their own verification status"
on public.teacher_verifications for select to authenticated
using (exists (
  select 1 from public.teacher_profiles p
  where p.id = teacher_profile_id and p.user_id = auth.uid()
));

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "Anyone can view profile images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-images');

create policy "Users can upload their own profile images"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own profile images"
on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read their own verification documents"
on storage.objects for select to authenticated
using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own verification documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
