-- 予約の変更・キャンセル・授業完了を、参加者だけがRPC経由で行えるようにする。
alter table public.lesson_reservations
  add column if not exists changed_from_reservation_id uuid references public.lesson_reservations(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists completed_at timestamptz;

create or replace function public.cancel_lesson_reservation(p_reservation_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_reservation public.lesson_reservations%rowtype; v_schedule_text text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  select * into v_reservation from public.lesson_reservations
    where id = p_reservation_id and (teacher_user_id = auth.uid() or student_user_id = auth.uid())
      and status in ('requested', 'accepted') for update;
  if not found then raise exception 'この予約はキャンセルできません'; end if;
  update public.lesson_reservations set status = 'cancelled', cancelled_at = now(), cancellation_reason = nullif(left(trim(coalesce(p_reason, '')), 300), '') where id = v_reservation.id;
  if v_reservation.conversation_id is not null then
    v_schedule_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI') || '〜（' || extract(epoch from (v_reservation.ends_at - v_reservation.starts_at))::integer / 60 || '分）';
    insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
    values (v_reservation.conversation_id, null, '予約がキャンセルされました：' || v_schedule_text, 'system');
  end if;
end; $$;

create or replace function public.change_lesson_reservation(p_reservation_id uuid, p_starts_at timestamptz, p_duration_minutes integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_reservation public.lesson_reservations%rowtype; v_new_id uuid; v_ends_at timestamptz; v_old_text text; v_new_text text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if p_duration_minutes not in (30, 45, 60, 90, 120, 150, 180) then raise exception '授業時間を選択してください'; end if;
  if p_starts_at < now() + interval '15 minutes' or date_trunc('minute', p_starts_at) <> p_starts_at or extract(minute from p_starts_at)::integer % 15 <> 0 then raise exception '15分単位の未来の時刻を選択してください'; end if;
  select * into v_reservation from public.lesson_reservations
    where id = p_reservation_id and (teacher_user_id = auth.uid() or student_user_id = auth.uid())
      and status in ('requested', 'accepted') for update;
  if not found then raise exception 'この予約は変更できません'; end if;
  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);
  update public.lesson_reservations set status = 'cancelled', cancelled_at = now(), cancellation_reason = '日時変更' where id = v_reservation.id;
  insert into public.lesson_reservations (conversation_id, teacher_user_id, student_user_id, starts_at, ends_at, status, subject, changed_from_reservation_id)
  values (v_reservation.conversation_id, v_reservation.teacher_user_id, v_reservation.student_user_id, p_starts_at, v_ends_at, 'requested', v_reservation.subject, v_reservation.id)
  returning id into v_new_id;
  if v_reservation.conversation_id is not null then
    v_old_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'MM月DD日 HH24:MI');
    v_new_text := to_char(p_starts_at at time zone 'Asia/Tokyo', 'MM月DD日 HH24:MI') || '〜（' || p_duration_minutes || '分）';
    insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
    values (v_reservation.conversation_id, null, '予約変更を申請しました：' || v_old_text || ' → ' || v_new_text || '（承認待ち）', 'system');
  end if;
  return v_new_id;
exception when exclusion_violation then raise exception 'この時間帯は、すでに別の予約申請または授業予定があります';
end; $$;

create or replace function public.complete_lesson_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_reservation public.lesson_reservations%rowtype; v_schedule_text text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  select * into v_reservation from public.lesson_reservations
    where id = p_reservation_id and teacher_user_id = auth.uid() and status = 'accepted' and starts_at <= now() for update;
  if not found then raise exception '開始時刻後の確定済み予約だけを完了にできます'; end if;
  update public.lesson_reservations set status = 'completed', completed_at = now() where id = v_reservation.id;
  insert into public.lesson_records (reservation_id, completed_at) values (v_reservation.id, now()) on conflict (reservation_id) do update set completed_at = excluded.completed_at;
  if v_reservation.conversation_id is not null then
    v_schedule_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI');
    insert into public.chat_messages (conversation_id, sender_user_id, body, message_type) values (v_reservation.conversation_id, null, '授業が完了しました：' || v_schedule_text, 'system');
  end if;
end; $$;

revoke all on function public.cancel_lesson_reservation(uuid, text) from public;
revoke all on function public.change_lesson_reservation(uuid, timestamptz, integer) from public;
revoke all on function public.complete_lesson_reservation(uuid) from public;
grant execute on function public.cancel_lesson_reservation(uuid, text) to authenticated;
grant execute on function public.change_lesson_reservation(uuid, timestamptz, integer) to authenticated;
grant execute on function public.complete_lesson_reservation(uuid) to authenticated;
