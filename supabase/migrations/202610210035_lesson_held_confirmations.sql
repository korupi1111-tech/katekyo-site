-- 予約した授業の終了時刻を過ぎたら、生徒と講師にだけ「授業は行われたか」を YES／NO で聞く。
-- 回答は記録のみ（授業数・ランクには反映しない。創業者決定 2026-10-21）。

create table if not exists public.lesson_held_confirmations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.lesson_reservations(id) on delete cascade,
  -- 予約と同じく、アカウント削除後は回答者を外して記録を残す（予約の保持期間1年に合わせる）。
  respondent_user_id uuid references public.user_profiles(id) on delete set null,
  respondent_role text not null check (respondent_role in ('student', 'teacher')),
  lesson_was_held boolean not null,
  answered_at timestamptz not null default now(),
  constraint lesson_held_confirmations_one_answer unique (reservation_id, respondent_user_id)
);

create index if not exists lesson_held_confirmations_respondent_idx
  on public.lesson_held_confirmations (respondent_user_id);

alter table public.lesson_held_confirmations enable row level security;
revoke insert, update, delete on public.lesson_held_confirmations from anon, authenticated;

drop policy if exists "Respondents can read their own lesson held answers" on public.lesson_held_confirmations;
create policy "Respondents can read their own lesson held answers"
on public.lesson_held_confirmations for select to authenticated
using (respondent_user_id = auth.uid());

drop policy if exists "MFA admins can read lesson held answers" on public.lesson_held_confirmations;
create policy "MFA admins can read lesson held answers"
on public.lesson_held_confirmations for select to authenticated
using (public.is_mfa_admin());

-- 書き込みは関数経由のみ。予約の当事者であり、終了時刻を過ぎた承認済み（または完了）の予約だけに答えられる。
create or replace function public.confirm_lesson_held(
  p_reservation_id uuid,
  p_lesson_was_held boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reservation public.lesson_reservations%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if not exists (select 1 from public.user_profiles where id = auth.uid() and account_status::text in ('active', 'pending_phone')) then
    raise exception '現在のアカウントの状態では回答できません';
  end if;
  if p_lesson_was_held is null then raise exception 'はい・いいえのどちらかを選んでください'; end if;

  select * into v_reservation from public.lesson_reservations where id = p_reservation_id;
  if not found then raise exception 'この予約は見つかりません'; end if;

  v_role := case
    when v_reservation.student_user_id = auth.uid() then 'student'
    when v_reservation.teacher_user_id = auth.uid() then 'teacher'
  end;
  if v_role is null then raise exception 'この予約には回答できません'; end if;
  if v_reservation.status not in ('accepted', 'completed') then raise exception '確定した予約だけ回答できます'; end if;
  if v_reservation.ends_at > now() then raise exception '授業の終了時刻を過ぎてから回答できます'; end if;

  insert into public.lesson_held_confirmations (reservation_id, respondent_user_id, respondent_role, lesson_was_held)
  values (p_reservation_id, auth.uid(), v_role, p_lesson_was_held);
exception when unique_violation then
  raise exception 'この授業にはすでに回答しています';
end;
$$;

revoke all on function public.confirm_lesson_held(uuid, boolean) from public, anon;
grant execute on function public.confirm_lesson_held(uuid, boolean) to authenticated;
