-- Lesson scheduling foundation. Run this file manually in the Supabase SQL editor.
-- Reservations are intentionally read-only from the browser for now. A future
-- server-side booking workflow must check payment and telephone verification.

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references public.user_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'booked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_slots_time_range check (ends_at > starts_at)
);

create table if not exists public.lesson_reservations (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references public.user_profiles(id) on delete restrict,
  student_user_id uuid not null references public.user_profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
  subject text,
  student_note text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_reservations_time_range check (ends_at > starts_at),
  constraint lesson_reservations_different_participants check (teacher_user_id <> student_user_id)
);

create table if not exists public.lesson_records (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.lesson_reservations(id) on delete cascade,
  teacher_note text,
  student_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists availability_slots_teacher_starts_at_idx
  on public.availability_slots (teacher_user_id, starts_at);
create index if not exists lesson_reservations_teacher_starts_at_idx
  on public.lesson_reservations (teacher_user_id, starts_at);
create index if not exists lesson_reservations_student_starts_at_idx
  on public.lesson_reservations (student_user_id, starts_at);

drop trigger if exists set_availability_slots_updated_at on public.availability_slots;
create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_reservations_updated_at on public.lesson_reservations;
create trigger set_lesson_reservations_updated_at
before update on public.lesson_reservations
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_records_updated_at on public.lesson_records;
create trigger set_lesson_records_updated_at
before update on public.lesson_records
for each row execute function public.set_updated_at();

alter table public.availability_slots enable row level security;
alter table public.lesson_reservations enable row level security;
alter table public.lesson_records enable row level security;

drop policy if exists "Enabled teachers manage their own availability" on public.availability_slots;
create policy "Enabled teachers manage their own availability" on public.availability_slots
for all to authenticated
using (teacher_user_id = auth.uid() and public.is_teacher_feature_enabled(auth.uid()))
with check (teacher_user_id = auth.uid() and public.is_teacher_feature_enabled(auth.uid()));

drop policy if exists "Participants read their own lesson reservations" on public.lesson_reservations;
create policy "Participants read their own lesson reservations" on public.lesson_reservations
for select to authenticated
using (teacher_user_id = auth.uid() or student_user_id = auth.uid());

drop policy if exists "Participants read their own lesson records" on public.lesson_records;
create policy "Participants read their own lesson records" on public.lesson_records
for select to authenticated
using (
  exists (
    select 1 from public.lesson_reservations reservation
    where reservation.id = lesson_records.reservation_id
      and (reservation.teacher_user_id = auth.uid() or reservation.student_user_id = auth.uid())
  )
);

-- Deliberately no client INSERT/UPDATE/DELETE policy for reservations or records.
-- A future Edge Function will create and confirm reservations after verifying plan,
-- phone verification and availability on the server.
