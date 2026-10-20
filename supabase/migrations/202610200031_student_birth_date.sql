-- 生徒の登録時に生年月日を受け取り、18歳未満かどうかをサーバー側で判定する。
-- 生年月日は公開せず、本人と運営だけが扱う。クライアントからの変更は禁止する。
alter table public.user_profiles
  add column if not exists birth_date date;

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
  requested_birth_date date;
  requested_is_minor boolean;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.account_role else 'student'::public.account_role end;
  requested_given_name := nullif(trim(new.raw_user_meta_data ->> 'given_name_kana'), '');
  requested_gender := nullif(new.raw_user_meta_data ->> 'gender', '');
  requested_legal_name := nullif(trim(new.raw_user_meta_data ->> 'legal_name'), '');

  begin
    requested_birth_date := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    requested_birth_date := null;
  end;
  if requested_birth_date is not null and (requested_birth_date > current_date or requested_birth_date < current_date - interval '120 years') then
    requested_birth_date := null;
  end if;
  -- 年齢はクライアントの申告ではなく、生年月日から判定する。
  requested_is_minor := case when requested_birth_date is null then null
    else requested_birth_date > (current_date - interval '18 years')::date end;

  if requested_gender not in ('男性', '女性') then
    requested_gender := null;
  end if;
  if requested_given_name is not null and requested_given_name !~ '^[ぁ-ゖー]+$' then
    requested_given_name := null;
  end if;

  insert into public.user_profiles (
    id, role, display_name, legal_name, given_name_kana, gender, contact_email, account_status,
    student_plan, email_verified_at, terms_accepted_at, privacy_accepted_at, birth_date, is_minor, guardian_consent_at
  ) values (
    new.id,
    requested_role,
    case when requested_role = 'teacher'::public.account_role and requested_given_name is not null
      then requested_given_name || '先生'
      else coalesce(requested_given_name, '生徒') end,
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
    case when new.raw_user_meta_data ->> 'privacy_accepted' = 'true' then now() else null end,
    case when requested_role = 'student'::public.account_role then requested_birth_date else null end,
    case when requested_role = 'student'::public.account_role then requested_is_minor else null end,
    case when requested_role = 'student'::public.account_role and requested_is_minor
      and new.raw_user_meta_data ->> 'guardian_consent' = 'true' then now() else null end
  );
  if requested_role = 'student'::public.account_role then
    insert into public.student_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

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
    new.privacy_accepted_at is distinct from old.privacy_accepted_at or
    new.birth_date is distinct from old.birth_date or
    new.is_minor is distinct from old.is_minor or
    new.guardian_consent_at is distinct from old.guardian_consent_at
  ) then raise exception 'Security-sensitive account fields cannot be changed by the client'; end if;
  return new;
end;
$$;
