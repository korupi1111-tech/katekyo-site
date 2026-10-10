-- A teacher can prepare and publish a self-declared public profile after email
-- verification. Phone verification remains available for higher-trust features
-- such as future booking and payment flows; it is not required to edit labels.
create or replace function public.is_teacher_profile_enabled(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = target_user
      and role::text = 'teacher'
      and account_status::text in ('pending_phone', 'active')
      and email_verified_at is not null
  );
$$;

create or replace function public.is_public_teacher(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher_profile_enabled(target_user);
$$;

drop policy if exists "Active teachers can create their own profile" on public.teacher_profiles;
drop policy if exists "Active teachers can update their own profile" on public.teacher_profiles;
create policy "Email-verified teachers can create their own profile"
on public.teacher_profiles for insert to authenticated
with check (user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid()));

create policy "Email-verified teachers can update their own profile"
on public.teacher_profiles for update to authenticated
using (user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid()))
with check (user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid()));
