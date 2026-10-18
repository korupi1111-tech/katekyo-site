-- 授業完了後に配信する、講師・生徒向けの簡易報告書。
-- 生徒は3回に1回だけ、公開プロフィールとの一致を確認する詳細版を受け取る。

create table if not exists public.lesson_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.lesson_reservations(id) on delete cascade,
  respondent_user_id uuid not null references public.user_profiles(id) on delete cascade,
  respondent_role text not null check (respondent_role in ('student', 'teacher')),
  survey_kind text not null check (survey_kind in ('basic', 'profile_check')),
  report_status text not null default 'pending' check (report_status in ('pending', 'submitted')),
  lesson_was_held boolean,
  issue_reasons text[] not null default '{}',
  profile_matched boolean,
  alignment_items text[] not null default '{}',
  review_comment text,
  delivered_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id, respondent_user_id),
  constraint lesson_feedback_reports_profile_only_for_detailed check (
    survey_kind = 'profile_check' or (profile_matched is null and cardinality(alignment_items) = 0)
  )
);

create index if not exists lesson_feedback_reports_respondent_status_idx
  on public.lesson_feedback_reports (respondent_user_id, report_status, delivered_at desc);

create index if not exists lesson_feedback_reports_reservation_idx
  on public.lesson_feedback_reports (reservation_id);

drop trigger if exists set_lesson_feedback_reports_updated_at on public.lesson_feedback_reports;
create trigger set_lesson_feedback_reports_updated_at
before update on public.lesson_feedback_reports
for each row execute function public.set_updated_at();

alter table public.lesson_feedback_reports enable row level security;

drop policy if exists "Respondents can read their own lesson feedback reports" on public.lesson_feedback_reports;
create policy "Respondents can read their own lesson feedback reports"
on public.lesson_feedback_reports for select to authenticated
using (respondent_user_id = auth.uid());

-- Reports are created and submitted only through the functions below. The browser
-- cannot alter a report's target reservation, role, status, or aggregate data.

create or replace function public.complete_lesson_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reservation public.lesson_reservations%rowtype;
  v_schedule_text text;
  v_student_completed_count integer;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  select * into v_reservation from public.lesson_reservations
    where id = p_reservation_id and teacher_user_id = auth.uid() and status = 'accepted' and starts_at <= now() for update;
  if not found then raise exception '開始時刻後の確定済み予約だけを完了にできます'; end if;

  update public.lesson_reservations set status = 'completed', completed_at = now() where id = v_reservation.id;
  insert into public.lesson_records (reservation_id, completed_at)
  values (v_reservation.id, now())
  on conflict (reservation_id) do update set completed_at = excluded.completed_at;

  -- この生徒にとって3回目ごとの完了授業だけ、プロフィール一致率の詳細確認にする。
  select count(*)::integer into v_student_completed_count
  from public.lesson_reservations
  where student_user_id = v_reservation.student_user_id and status = 'completed';

  insert into public.lesson_feedback_reports (reservation_id, respondent_user_id, respondent_role, survey_kind)
  values
    (v_reservation.id, v_reservation.teacher_user_id, 'teacher', 'basic'),
    (v_reservation.id, v_reservation.student_user_id, 'student', case when mod(v_student_completed_count, 3) = 0 then 'profile_check' else 'basic' end)
  on conflict (reservation_id, respondent_user_id) do nothing;

  if v_reservation.conversation_id is not null then
    v_schedule_text := to_char(v_reservation.starts_at at time zone 'Asia/Tokyo', 'YYYY年MM月DD日 HH24:MI');
    insert into public.chat_messages (conversation_id, sender_user_id, body, message_type)
    values (v_reservation.conversation_id, null, '授業が完了しました：' || v_schedule_text || '。マイページに授業報告書を配信しました。', 'system');
  end if;
end; $$;

create or replace function public.submit_lesson_feedback_report(
  p_report_id uuid,
  p_lesson_was_held boolean,
  p_issue_reasons text[] default '{}'::text[],
  p_profile_matched boolean default null,
  p_alignment_items text[] default '{}'::text[],
  p_review_comment text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_report public.lesson_feedback_reports%rowtype;
  v_reservation public.lesson_reservations%rowtype;
  v_issue_reasons text[];
  v_alignment_items text[];
  v_teacher_profile_id uuid;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;

  select * into v_report from public.lesson_feedback_reports
  where id = p_report_id and respondent_user_id = auth.uid() and report_status = 'pending'
  for update;
  if not found then raise exception 'この授業報告書は提出できません'; end if;

  select * into v_reservation from public.lesson_reservations where id = v_report.reservation_id;
  if not found or v_reservation.status <> 'completed' then raise exception '完了済みの授業だけ報告できます'; end if;

  select coalesce(array_agg(value), '{}'::text[]) into v_issue_reasons
  from (
    select left(trim(reason), 80) as value
    from unnest(coalesce(p_issue_reasons, '{}'::text[])) as reason
    where trim(reason) <> ''
    limit 6
  ) reasons;
  if not p_lesson_was_held and cardinality(v_issue_reasons) = 0 then
    raise exception 'NOの場合は、当てはまる理由を選択してください';
  end if;

  select coalesce(array_agg(value), '{}'::text[]) into v_alignment_items
  from (
    select left(trim(item), 80) as value
    from unnest(coalesce(p_alignment_items, '{}'::text[])) as item
    where trim(item) <> ''
    limit 8
  ) items;
  if v_report.survey_kind = 'profile_check' and p_profile_matched is null then
    raise exception 'プロフィール内容との一致を選択してください';
  end if;

  update public.lesson_feedback_reports
  set lesson_was_held = p_lesson_was_held,
      issue_reasons = v_issue_reasons,
      profile_matched = case when survey_kind = 'profile_check' then p_profile_matched else null end,
      alignment_items = case when survey_kind = 'profile_check' then v_alignment_items else '{}'::text[] end,
      review_comment = case when survey_kind = 'profile_check' then nullif(left(trim(coalesce(p_review_comment, '')), 500), '') else null end,
      report_status = 'submitted',
      submitted_at = now()
  where id = v_report.id;

  -- 生徒の提出後にだけ実績を集計する。プロフィール一致率は詳細版の Yes 比率。
  if v_report.respondent_role = 'student' then
    select id into v_teacher_profile_id from public.teacher_profiles where user_id = v_reservation.teacher_user_id;
    if v_teacher_profile_id is not null then
      update public.teacher_metrics metrics
      set total_lessons = coalesce((
            select count(*)::integer
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student'
              and feedback.report_status = 'submitted'
              and feedback.lesson_was_held is true
              and reservation.teacher_user_id = v_reservation.teacher_user_id
          ), 0),
          season_lessons = coalesce((
            select count(*)::integer
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student'
              and feedback.report_status = 'submitted'
              and feedback.lesson_was_held is true
              and reservation.teacher_user_id = v_reservation.teacher_user_id
              and reservation.completed_at at time zone 'Asia/Tokyo' >= date_trunc('year', now() at time zone 'Asia/Tokyo')
          ), 0),
          profile_match_rate = (
            select round(avg(case when feedback.profile_matched then 100::numeric else 0::numeric end), 2)
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student'
              and feedback.report_status = 'submitted'
              and feedback.survey_kind = 'profile_check'
              and feedback.profile_matched is not null
              and reservation.teacher_user_id = v_reservation.teacher_user_id
          )
      where metrics.teacher_profile_id = v_teacher_profile_id;
    end if;
  end if;
end; $$;

revoke all on function public.complete_lesson_reservation(uuid) from public;
revoke all on function public.submit_lesson_feedback_report(uuid, boolean, text[], boolean, text[], text) from public;
grant execute on function public.complete_lesson_reservation(uuid) to authenticated;
grant execute on function public.submit_lesson_feedback_report(uuid, boolean, text[], boolean, text[], text) to authenticated;
