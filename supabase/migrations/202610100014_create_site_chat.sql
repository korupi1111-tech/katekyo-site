-- Private one-to-one chat. A conversation is always one teacher and one
-- student, and database policies restrict all reads and sends to those two
-- participants.
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references public.user_profiles(id) on delete cascade,
  student_user_id uuid not null references public.user_profiles(id) on delete cascade,
  teacher_display_name text not null check (char_length(teacher_display_name) between 1 and 80),
  student_display_name text not null check (char_length(student_display_name) between 1 and 80),
  teacher_subject text,
  last_message_text text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_conversations_distinct_participants check (teacher_user_id <> student_user_id),
  constraint chat_conversations_teacher_student_unique unique (teacher_user_id, student_user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.user_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index chat_conversations_participant_idx on public.chat_conversations (teacher_user_id, last_message_at desc);
create index chat_conversations_student_idx on public.chat_conversations (student_user_id, last_message_at desc);
create index chat_messages_conversation_created_idx on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.is_chat_participant(target_conversation uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_conversations
    where id = target_conversation
      and (teacher_user_id = target_user or student_user_id = target_user)
  );
$$;

create policy "Participants can read their chat conversations"
on public.chat_conversations for select to authenticated
using (teacher_user_id = auth.uid() or student_user_id = auth.uid());

create policy "Participants can read their chat messages"
on public.chat_messages for select to authenticated
using (public.is_chat_participant(conversation_id));

create policy "Participants can send chat messages"
on public.chat_messages for insert to authenticated
with check (sender_user_id = auth.uid() and public.is_chat_participant(conversation_id));

create or replace function public.update_chat_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversations
  set last_message_text = new.body,
      last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_chat_message_created
after insert on public.chat_messages
for each row execute function public.update_chat_conversation_last_message();

-- Students start a chat from a public teacher profile. This keeps the
-- counterpart selection server-side and prevents an arbitrary user-id from
-- being supplied by the browser.
create or replace function public.start_chat_with_teacher(target_teacher_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_name text;
  matched_teacher_user_id uuid;
  matched_teacher_name text;
  matched_teacher_subject text;
  conversation_id uuid;
begin
  select display_name into current_student_name
  from public.user_profiles
  where id = auth.uid()
    and role::text in ('student', 'guardian')
    and email_verified_at is not null
    and account_status::text in ('active', 'pending_phone');

  if current_student_name is null or btrim(current_student_name) = '' then
    raise exception 'メール認証済みの生徒・保護者アカウントでログインしてください';
  end if;

  select profile.user_id, profile.display_name, profile.main_subject
    into matched_teacher_user_id, matched_teacher_name, matched_teacher_subject
  from public.teacher_profiles profile
  where profile.id = target_teacher_profile_id
    and profile.is_published
    and public.is_public_teacher(profile.user_id);

  if matched_teacher_user_id is null then
    raise exception 'この講師とは現在チャットを開始できません';
  end if;

  insert into public.chat_conversations (
    teacher_user_id, student_user_id, teacher_display_name, student_display_name, teacher_subject
  ) values (
    matched_teacher_user_id, auth.uid(), matched_teacher_name, current_student_name, matched_teacher_subject
  ) on conflict (teacher_user_id, student_user_id) do update set
    teacher_display_name = excluded.teacher_display_name,
    student_display_name = excluded.student_display_name,
    teacher_subject = excluded.teacher_subject
  returning id into conversation_id;

  return conversation_id;
end;
$$;

revoke all on function public.is_chat_participant(uuid, uuid) from public;
revoke all on function public.update_chat_conversation_last_message() from public;
revoke all on function public.start_chat_with_teacher(uuid) from public;
grant execute on function public.start_chat_with_teacher(uuid) to authenticated;

-- Deliver new messages to open participant sessions without a page reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
exception when undefined_object then
  null;
end;
$$;
