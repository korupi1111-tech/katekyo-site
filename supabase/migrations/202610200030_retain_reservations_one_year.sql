-- プライバシーポリシーに合わせ、退会者の予約・授業履歴はアカウント削除後も1年を目安に保管する。
-- アカウント削除時は参加者IDを外して匿名化し、retained_until を過ぎたら日次ジョブで削除する。
alter table public.lesson_reservations
  add column if not exists retained_until timestamptz;

alter table public.lesson_reservations
  alter column teacher_user_id drop not null,
  alter column student_user_id drop not null;

alter table public.lesson_reservations
  drop constraint if exists lesson_reservations_teacher_user_id_fkey,
  drop constraint if exists lesson_reservations_student_user_id_fkey;

alter table public.lesson_reservations
  add constraint lesson_reservations_teacher_user_id_fkey
    foreign key (teacher_user_id) references public.user_profiles(id) on delete set null,
  add constraint lesson_reservations_student_user_id_fkey
    foreign key (student_user_id) references public.user_profiles(id) on delete set null;

create or replace function public.purge_expired_retention_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare deleted_chats integer; deleted_inquiries integer; deleted_reservations integer;
begin
  delete from public.chat_conversations conversation
  using public.account_deletion_requests request
  where request.user_id in (conversation.teacher_user_id, conversation.student_user_id)
    and request.chat_purge_after <= now();
  get diagnostics deleted_chats = row_count;

  delete from public.inquiries where created_at < now() - interval '1 year';
  get diagnostics deleted_inquiries = row_count;

  delete from public.lesson_reservations where retained_until is not null and retained_until <= now();
  get diagnostics deleted_reservations = row_count;
  return jsonb_build_object('deleted_chats', deleted_chats, 'deleted_inquiries', deleted_inquiries, 'deleted_reservations', deleted_reservations);
end;
$$;
revoke all on function public.purge_expired_retention_data() from public, anon, authenticated;
grant execute on function public.purge_expired_retention_data() to service_role;
