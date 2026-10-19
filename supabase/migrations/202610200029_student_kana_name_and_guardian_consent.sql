-- 講師に見える生徒名を「下の名前のひらがな」に限定し、登録時の未成年確認と保護者同意を記録する。
alter table public.user_profiles
  add column if not exists is_minor boolean,
  add column if not exists guardian_consent_at timestamptz;

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
  requested_is_minor boolean;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'teacher'
    then 'teacher'::public.account_role else 'student'::public.account_role end;
  requested_given_name := nullif(trim(new.raw_user_meta_data ->> 'given_name_kana'), '');
  requested_gender := nullif(new.raw_user_meta_data ->> 'gender', '');
  requested_legal_name := nullif(trim(new.raw_user_meta_data ->> 'legal_name'), '');
  requested_is_minor := case new.raw_user_meta_data ->> 'is_minor' when 'true' then true when 'false' then false else null end;

  if requested_gender not in ('男性', '女性') then
    requested_gender := null;
  end if;
  if requested_given_name is not null and requested_given_name !~ '^[ぁ-ゖー]+$' then
    requested_given_name := null;
  end if;

  insert into public.user_profiles (
    id, role, display_name, legal_name, given_name_kana, gender, contact_email, account_status,
    student_plan, email_verified_at, terms_accepted_at, privacy_accepted_at, is_minor, guardian_consent_at
  ) values (
    new.id,
    requested_role,
    case when requested_role = 'teacher'::public.account_role and requested_given_name is not null
      then requested_given_name || '先生'
      -- 生徒の本名は legal_name にのみ保存し、表示名には下の名前のひらがなだけを使う。
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
    new.is_minor is distinct from old.is_minor or
    new.guardian_consent_at is distinct from old.guardian_consent_at
  ) then raise exception 'Security-sensitive account fields cannot be changed by the client'; end if;
  return new;
end;
$$;

-- 既存の生徒の表示名と、講師側に見えるチャット上の生徒名を置き換える。
update public.user_profiles
set display_name = given_name_kana
where role::text in ('student', 'guardian')
  and given_name_kana ~ '^[ぁ-ゖー]+$';

update public.chat_conversations conversation
set student_display_name = profile.given_name_kana
from public.user_profiles profile
where conversation.student_user_id = profile.id
  and conversation.withdrawn_at is null
  and profile.given_name_kana ~ '^[ぁ-ゖー]+$';
