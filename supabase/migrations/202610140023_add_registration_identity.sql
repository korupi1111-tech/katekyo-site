-- Registration identity is private account data. It is never returned by the public teacher directory.
alter table public.user_profiles
  add column if not exists given_name_kana text,
  add column if not exists gender text check (gender in ('男性', '女性'));

-- Copy the new registration metadata for accounts created before this migration was applied.
update public.user_profiles profile
set given_name_kana = coalesce(profile.given_name_kana, nullif(auth_user.raw_user_meta_data ->> 'given_name_kana', '')),
    gender = coalesce(profile.gender, case when auth_user.raw_user_meta_data ->> 'gender' in ('男性', '女性') then auth_user.raw_user_meta_data ->> 'gender' end)
from auth.users auth_user
where profile.id = auth_user.id;

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.account_role;
  requested_given_name text;
  requested_gender text;
  requested_legal_name text;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.account_role else 'student'::public.account_role end;
  requested_given_name := nullif(trim(new.raw_user_meta_data ->> 'given_name_kana'), '');
  requested_gender := nullif(new.raw_user_meta_data ->> 'gender', '');
  requested_legal_name := nullif(trim(new.raw_user_meta_data ->> 'legal_name'), '');

  if requested_gender not in ('男性', '女性') then
    requested_gender := null;
  end if;

  insert into public.user_profiles (
    id, role, display_name, legal_name, given_name_kana, gender, contact_email, account_status,
    student_plan, email_verified_at, terms_accepted_at, privacy_accepted_at
  ) values (
    new.id,
    requested_role,
    case when requested_role = 'teacher'::public.account_role and requested_given_name is not null
      then requested_given_name || '先生'
      else coalesce(requested_legal_name, new.raw_user_meta_data ->> 'display_name', '') end,
    requested_legal_name,
    requested_given_name,
    requested_gender,
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

-- Browser clients cannot later alter registered name, gender, role, plan, or verification state.
create or replace function public.protect_account_security_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() = old.id and (
    new.role is distinct from old.role or
    new.display_name is distinct from old.display_name or
    new.legal_name is distinct from old.legal_name or
    new.given_name_kana is distinct from old.given_name_kana or
    new.gender is distinct from old.gender or
    new.account_status is distinct from old.account_status or
    new.student_plan is distinct from old.student_plan or
    new.email_verified_at is distinct from old.email_verified_at or
    new.phone_verified_at is distinct from old.phone_verified_at or
    new.terms_accepted_at is distinct from old.terms_accepted_at or
    new.privacy_accepted_at is distinct from old.privacy_accepted_at
  ) then raise exception 'Security-sensitive account fields cannot be changed by the client'; end if;
  return new;
end;
$$;

-- A teacher profile name and gender are copied from the private registration record, not trusted from the browser form.
create or replace function public.enforce_teacher_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_record record;
begin
  select role, given_name_kana, gender into account_record
  from public.user_profiles where id = new.user_id;

  if account_record.role = 'teacher'::public.account_role then
    if account_record.given_name_kana is not null then
      new.display_name := account_record.given_name_kana || '先生';
    end if;
    if account_record.gender is not null then
      new.gender := account_record.gender;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_teacher_profile_identity on public.teacher_profiles;
create trigger enforce_teacher_profile_identity
before insert or update on public.teacher_profiles
for each row execute function public.enforce_teacher_profile_identity();
