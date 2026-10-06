-- Account and authorization foundation. Run this migration in the Supabase SQL editor.
-- No browser client can promote a role, account status, verification status, or student plan.

alter table public.user_profiles
  add column if not exists contact_email text,
  add column if not exists legal_name text,
  add column if not exists account_status text not null default 'pending_email'
    check (account_status in ('pending_email', 'pending_phone', 'active', 'suspended', 'withdrawn', 'review_pending', 'review_approved')),
  add column if not exists student_plan text not null default 'free'
    check (student_plan in ('free', 'payment_pending', 'paid', 'expired', 'cancelled')),
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;

create table if not exists public.student_profiles (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  profile_text text,
  school_or_grade text,
  study_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

-- The requested role is accepted only at account creation. It cannot be changed later by the client.
create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.account_role;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.account_role else 'student'::public.account_role end;
  insert into public.user_profiles (
    id, role, display_name, legal_name, contact_email, account_status,
    student_plan, email_verified_at, terms_accepted_at, privacy_accepted_at
  ) values (
    new.id,
    requested_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'legal_name', ''),
    new.email,
    case when new.email_confirmed_at is not null and requested_role = 'teacher'::public.account_role then 'pending_phone'
         when new.email_confirmed_at is not null then 'active'
         else 'pending_email' end,
    'free',
    new.email_confirmed_at,
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    case when new.raw_user_meta_data ->> 'privacy_accepted' = 'true' then now() else null end
  );
  if requested_role = 'student'::public.account_role then
    insert into public.student_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Auth is the authority for verification. Sync only from auth.users triggers, never client updates.
create or replace function public.sync_account_auth_state()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_role public.account_role;
begin
  select role into current_role from public.user_profiles where id = new.id;
  update public.user_profiles
  set email_verified_at = new.email_confirmed_at,
      phone_verified_at = new.phone_confirmed_at,
      account_status = case
        when account_status in ('suspended', 'withdrawn', 'review_pending') then account_status
        when new.email_confirmed_at is null then 'pending_email'
        when current_role = 'teacher'::public.account_role and new.phone_confirmed_at is null then 'pending_phone'
        else 'active'
      end
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_user_profile();

drop trigger if exists on_auth_user_verification_changed on auth.users;
create trigger on_auth_user_verification_changed after update of email_confirmed_at, phone_confirmed_at on auth.users
for each row when (old.email_confirmed_at is distinct from new.email_confirmed_at or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
execute function public.sync_account_auth_state();

-- Bring pre-existing authenticated users into the same state model once.
update public.user_profiles p
set contact_email = coalesce(p.contact_email, u.email),
    email_verified_at = u.email_confirmed_at,
    phone_verified_at = u.phone_confirmed_at,
    account_status = case
      when p.account_status in ('suspended', 'withdrawn', 'review_pending') then p.account_status
      when u.email_confirmed_at is null then 'pending_email'
      when p.role = 'teacher'::public.account_role and u.phone_confirmed_at is null then 'pending_phone'
      else 'active'
    end
from auth.users u where p.id = u.id;

create or replace function public.protect_account_security_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() = old.id and (
    new.role is distinct from old.role or
    new.account_status is distinct from old.account_status or
    new.student_plan is distinct from old.student_plan or
    new.email_verified_at is distinct from old.email_verified_at or
    new.phone_verified_at is distinct from old.phone_verified_at or
    new.terms_accepted_at is distinct from old.terms_accepted_at or
    new.privacy_accepted_at is distinct from old.privacy_accepted_at or
    new.legal_name is distinct from old.legal_name
  ) then raise exception 'Security-sensitive account fields cannot be changed by the client'; end if;
  return new;
end;
$$;

drop trigger if exists protect_account_security_fields on public.user_profiles;
create trigger protect_account_security_fields before update on public.user_profiles
for each row execute function public.protect_account_security_fields();

create or replace function public.is_teacher_feature_enabled(target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = target_user and role = 'teacher' and account_status = 'active'
      and email_verified_at is not null and phone_verified_at is not null
  );
$$;

create or replace function public.is_public_teacher(target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_teacher_feature_enabled(target_user);
$$;

-- Replace permissive first-stage profile policies.
drop policy if exists "Users can read their own account profile" on public.user_profiles;
drop policy if exists "Users can update their own account profile" on public.user_profiles;
create policy "Users can read their own account profile" on public.user_profiles
for select to authenticated using (id = auth.uid());
create policy "Users can update their display name" on public.user_profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.student_profiles enable row level security;
create policy "Students can read their own profile" on public.student_profiles
for select to authenticated using (user_id = auth.uid());
create policy "Students can update their own profile" on public.student_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Teachers can create their own profile" on public.teacher_profiles;
drop policy if exists "Teachers can update their own profile" on public.teacher_profiles;
drop policy if exists "Published teacher profiles are publicly visible" on public.teacher_profiles;
create policy "Active teachers can create their own profile" on public.teacher_profiles
for insert to authenticated with check (user_id = auth.uid() and public.is_teacher_feature_enabled(auth.uid()));
create policy "Active teachers can update their own profile" on public.teacher_profiles
for update to authenticated using (user_id = auth.uid() and public.is_teacher_feature_enabled(auth.uid()))
with check (user_id = auth.uid() and public.is_teacher_feature_enabled(auth.uid()));
create policy "Eligible published teacher profiles are publicly visible" on public.teacher_profiles
for select to anon, authenticated using (is_published and public.is_public_teacher(user_id));

drop policy if exists "Published metrics are publicly visible" on public.teacher_metrics;
create policy "Eligible published metrics are publicly visible" on public.teacher_metrics
for select to anon, authenticated using (exists (
  select 1 from public.teacher_profiles p
  where p.id = teacher_profile_id and p.is_published and public.is_public_teacher(p.user_id)
));

-- Do not turn a student into a teacher merely because a profile row was inserted.
create or replace function public.create_teacher_profile_records()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.teacher_metrics (teacher_profile_id) values (new.id) on conflict do nothing;
  insert into public.teacher_verifications (teacher_profile_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
