-- 講師が手動で公開する「対応可能な日程」。確定予約ではなく、予約申請前の目安として使う。
create table if not exists public.teacher_availability_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  available_on date not null,
  starts_at time,
  ends_at time,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_availability_notes_time_range check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint teacher_availability_notes_note_length check (char_length(coalesce(note, '')) <= 240)
);

create index if not exists teacher_availability_notes_public_idx
  on public.teacher_availability_notes (teacher_profile_id, available_on);

create trigger set_teacher_availability_notes_updated_at
before update on public.teacher_availability_notes
for each row execute function public.set_updated_at();

alter table public.teacher_availability_notes enable row level security;

create policy "Public can read eligible teacher availability notes"
on public.teacher_availability_notes for select to anon, authenticated
using (exists (
  select 1 from public.teacher_profiles profile
  where profile.id = teacher_profile_id and profile.is_published and public.is_public_teacher(profile.user_id)
));

create policy "Teachers can read their own availability notes"
on public.teacher_availability_notes for select to authenticated
using (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid()));

create policy "Teachers can add their own availability notes"
on public.teacher_availability_notes for insert to authenticated
with check (exists (
  select 1 from public.teacher_profiles profile
  where profile.id = teacher_profile_id and profile.user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid())
));

create policy "Teachers can update their own availability notes"
on public.teacher_availability_notes for update to authenticated
using (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid())) )
with check (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid())) );

create policy "Teachers can delete their own availability notes"
on public.teacher_availability_notes for delete to authenticated
using (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid())) );
