-- 運営経由の講師問い合わせで使う、講師の仕事用メールアドレスと、それを問い合わせ者へ渡すことへの同意。
-- 公開プロフィールとは別テーブルにし、本人と運営（MFA管理者）だけが読める（利用規約 第5条の2）。

create table if not exists public.teacher_contact_settings (
  teacher_user_id uuid primary key references public.user_profiles(id) on delete cascade,
  work_email text check (work_email is null or (char_length(work_email) <= 254 and work_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  share_consent boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint teacher_contact_settings_consent_needs_email check (not share_consent or work_email is not null)
);

alter table public.teacher_contact_settings enable row level security;

drop policy if exists "Teachers can read their own contact settings" on public.teacher_contact_settings;
create policy "Teachers can read their own contact settings"
on public.teacher_contact_settings for select to authenticated
using (teacher_user_id = auth.uid());

drop policy if exists "MFA admins can read teacher contact settings" on public.teacher_contact_settings;
create policy "MFA admins can read teacher contact settings"
on public.teacher_contact_settings for select to authenticated
using (public.is_mfa_admin());

-- 書き込みは関数経由のみ。同意した日時と文言の版はサーバー側で記録する。
create or replace function public.save_my_teacher_contact(
  p_work_email text,
  p_share_consent boolean,
  p_consent_version text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_work_email, ''))), '');
  v_previous public.teacher_contact_settings%rowtype;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if not exists (select 1 from public.user_profiles where id = auth.uid() and role::text = 'teacher') then
    raise exception '講師アカウントだけが設定できます';
  end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise exception 'メールアドレスの形式を確認してください';
  end if;
  if coalesce(p_share_consent, false) and v_email is null then
    raise exception '同意するには仕事用メールアドレスを入力してください';
  end if;

  select * into v_previous from public.teacher_contact_settings where teacher_user_id = auth.uid();

  insert into public.teacher_contact_settings (teacher_user_id, work_email, share_consent, consent_version, consented_at, updated_at)
  values (
    auth.uid(), v_email, coalesce(p_share_consent, false),
    case when coalesce(p_share_consent, false) then left(p_consent_version, 40) end,
    case when coalesce(p_share_consent, false) then now() end,
    now()
  )
  on conflict (teacher_user_id) do update set
    work_email = excluded.work_email,
    share_consent = excluded.share_consent,
    -- 同意を続けている間は、最初に同意した日時と版を残す。メールアドレスを変えたときは取り直す。
    consent_version = case
      when not excluded.share_consent then null
      when v_previous.share_consent and v_previous.work_email is not distinct from excluded.work_email then v_previous.consent_version
      else excluded.consent_version end,
    consented_at = case
      when not excluded.share_consent then null
      when v_previous.share_consent and v_previous.work_email is not distinct from excluded.work_email then v_previous.consented_at
      else excluded.consented_at end,
    updated_at = now();
end;
$$;

revoke all on function public.save_my_teacher_contact(text, boolean, text) from public;
grant execute on function public.save_my_teacher_contact(text, boolean, text) to authenticated;
