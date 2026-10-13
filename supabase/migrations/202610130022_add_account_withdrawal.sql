-- Account withdrawal immediately disables access and public visibility.
-- Retention jobs can use this request record for their later deletion windows.
create table if not exists public.account_deletion_requests (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  account_data_purge_after timestamptz not null default (now() + interval '30 days'),
  chat_purge_after timestamptz not null default (now() + interval '90 days'),
  reservation_purge_after timestamptz not null default (now() + interval '1 year'),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
-- No browser policy: requests are created only by the authenticated Edge Function.

alter table public.chat_conversations add column if not exists withdrawn_at timestamptz;

drop policy if exists "Participants can read their chat conversations" on public.chat_conversations;
create policy "Active participants can read their chat conversations"
on public.chat_conversations for select to authenticated
using (withdrawn_at is null and (teacher_user_id = auth.uid() or student_user_id = auth.uid()));

create or replace function public.is_chat_participant(target_conversation uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_conversations
    where id = target_conversation and withdrawn_at is null
      and (teacher_user_id = target_user or student_user_id = target_user)
  );
$$;

-- This only removes expired non-account data. The final auth-user purge needs
-- a dedicated administrative job because reservations retain foreign keys.
create or replace function public.purge_expired_retention_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare deleted_chats integer; deleted_inquiries integer;
begin
  delete from public.chat_conversations conversation
  using public.account_deletion_requests request
  where request.user_id in (conversation.teacher_user_id, conversation.student_user_id)
    and request.chat_purge_after <= now();
  get diagnostics deleted_chats = row_count;

  delete from public.inquiries where created_at < now() - interval '1 year';
  get diagnostics deleted_inquiries = row_count;
  return jsonb_build_object('deleted_chats', deleted_chats, 'deleted_inquiries', deleted_inquiries);
end;
$$;
revoke all on function public.purge_expired_retention_data() from public, anon, authenticated;
grant execute on function public.purge_expired_retention_data() to service_role;
