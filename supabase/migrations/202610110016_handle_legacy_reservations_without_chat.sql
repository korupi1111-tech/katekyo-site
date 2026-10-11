-- Preserve the reservation workflow even if a pre-workflow reservation has no conversation.
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

  if v_reservation.conversation_id is not null then
    v_schedule_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI')
      || '〜（' || extract(epoch from (v_reservation.ends_at - v_reservation.starts_at))::integer / 60 || '分）';
    insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
    values (
      v_reservation.conversation_id,
      null,
      case when p_accept then '予約が確定しました：' || v_schedule_text else '予約申請は見送られました：' || v_schedule_text end,
      'system'
    );
  end if;
end;
$$;
