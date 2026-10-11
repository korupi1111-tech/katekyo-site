-- Reservation workflow. Apply through the Supabase SQL editor / migration runner.
-- All writes use the RPCs below; browser clients keep read-only access to reservations.

alter table public.lesson_reservations
  add column if not exists conversation_id uuid references public.chat_conversations(id) on delete set null;

alter table public.chat_messages
  add column if not exists message_type text not null default 'user'
    check (message_type in ('user', 'system'));

alter table public.chat_messages
  alter column sender_user_id drop not null;

drop policy if exists "Participants can send chat messages" on public.chat_messages;
create policy "Participants can send chat messages"
on public.chat_messages for insert to authenticated
with check (
  message_type = 'user'
  and sender_user_id = auth.uid()
  and public.is_chat_participant(conversation_id)
);

create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lesson_reservations_no_teacher_overlap'
  ) then
    alter table public.lesson_reservations
      add constraint lesson_reservations_no_teacher_overlap
      exclude using gist (
        teacher_user_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status in ('requested', 'accepted'));
  end if;
end;
$$;

create or replace function public.request_lesson_reservation(
  p_conversation_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_user_id uuid;
  v_student_user_id uuid;
  v_subject text;
  v_reservation_id uuid;
  v_ends_at timestamptz;
  v_schedule_text text;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  if p_duration_minutes not in (30, 45, 60, 90, 120, 150, 180) then
    raise exception '授業時間を選択してください';
  end if;
  if p_starts_at < now() + interval '15 minutes'
    or date_trunc('minute', p_starts_at) <> p_starts_at
    or extract(minute from p_starts_at)::integer % 15 <> 0 then
    raise exception '15分単位の未来の時刻を選択してください';
  end if;

  select conversation.teacher_user_id, conversation.student_user_id, conversation.teacher_subject
    into v_teacher_user_id, v_student_user_id, v_subject
  from public.chat_conversations conversation
  where conversation.id = p_conversation_id
    and conversation.student_user_id = auth.uid();

  if v_student_user_id is null then
    raise exception 'この会話から予約を申請できません';
  end if;
  if not exists (
    select 1 from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.role::text in ('student', 'guardian')
      and profile.email_verified_at is not null
      and profile.account_status::text in ('active', 'pending_phone')
  ) then
    raise exception 'メール認証済みの生徒アカウントで申請してください';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);
  insert into public.lesson_reservations (
    conversation_id, teacher_user_id, student_user_id, starts_at, ends_at, status, subject
  ) values (
    p_conversation_id, v_teacher_user_id, auth.uid(), p_starts_at, v_ends_at, 'requested', coalesce(v_subject, '個別授業')
  ) returning id into v_reservation_id;

  v_schedule_text := to_char(p_starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI')
    || '〜（' || p_duration_minutes || '分）';
  insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
  values (p_conversation_id, null, '予約を申請しました：' || v_schedule_text || '（承認待ち）', 'system');

  return v_reservation_id;
exception when exclusion_violation then
  raise exception 'この時間帯は、すでに別の予約申請または授業予定があります';
end;
$$;

create or replace function public.respond_lesson_reservation(
  p_reservation_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.lesson_reservations%rowtype;
  v_schedule_text text;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  select * into v_reservation
  from public.lesson_reservations reservation
  where reservation.id = p_reservation_id
    and reservation.teacher_user_id = auth.uid()
    and reservation.status = 'requested'
  for update;

  if not found then
    raise exception 'この予約申請には対応できません';
  end if;
  if not exists (
    select 1 from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.role::text = 'teacher'
      and profile.email_verified_at is not null
      and profile.account_status::text in ('active', 'pending_phone')
  ) then
    raise exception 'メール認証済みの講師アカウントで対応してください';
  end if;

  update public.lesson_reservations
  set status = case when p_accept then 'accepted' else 'declined' end,
      confirmed_at = case when p_accept then now() else null end
  where id = v_reservation.id;

  v_schedule_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI')
    || '〜（' || extract(epoch from (v_reservation.ends_at - v_reservation.starts_at))::integer / 60 || '分）';
  insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
  values (
    v_reservation.conversation_id,
    null,
    case when p_accept then '予約が確定しました：' || v_schedule_text else '予約申請は見送られました：' || v_schedule_text end,
    'system'
  );
end;
$$;

revoke all on function public.request_lesson_reservation(uuid, timestamptz, integer) from public;
revoke all on function public.respond_lesson_reservation(uuid, boolean) from public;
grant execute on function public.request_lesson_reservation(uuid, timestamptz, integer) to authenticated;
grant execute on function public.respond_lesson_reservation(uuid, boolean) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lesson_reservations'
  ) then
    alter publication supabase_realtime add table public.lesson_reservations;
  end if;
exception when undefined_object then
  null;
end;
$$;
