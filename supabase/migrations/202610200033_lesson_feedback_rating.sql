-- 授業後アンケートの詳細版（3回に1回）に、講師への5段階評価を追加する。
-- 評価は生徒の詳細版でだけ受け付け、講師ごとの平均と件数を teacher_metrics に集計する。
alter table public.lesson_feedback_reports
  add column if not exists teacher_rating smallint check (teacher_rating between 1 and 5);

alter table public.lesson_feedback_reports
  drop constraint if exists lesson_feedback_reports_profile_only_for_detailed;
alter table public.lesson_feedback_reports
  add constraint lesson_feedback_reports_profile_only_for_detailed check (
    survey_kind = 'profile_check' or (profile_matched is null and cardinality(alignment_items) = 0 and teacher_rating is null)
  );

alter table public.teacher_metrics
  add column if not exists average_rating numeric(3,2) check (average_rating is null or average_rating between 1 and 5),
  add column if not exists rating_count integer not null default 0 check (rating_count >= 0);

drop function if exists public.submit_lesson_feedback_report(uuid, boolean, text[], boolean, text[], text);

create or replace function public.submit_lesson_feedback_report(
  p_report_id uuid,
  p_lesson_was_held boolean,
  p_issue_reasons text[] default '{}'::text[],
  p_profile_matched boolean default null,
  p_alignment_items text[] default '{}'::text[],
  p_review_comment text default null,
  p_teacher_rating smallint default null
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

  -- 「その他：自由記述」も1件として受け付ける（最大120文字）。
  select coalesce(array_agg(value), '{}'::text[]) into v_issue_reasons
  from (
    select left(trim(reason), 120) as value
    from unnest(coalesce(p_issue_reasons, '{}'::text[])) as reason
    where trim(reason) <> ''
    limit 6
  ) reasons;
  if not p_lesson_was_held and cardinality(v_issue_reasons) = 0 then
    raise exception '授業がなかった場合は、理由を選択してください';
  end if;

  select coalesce(array_agg(value), '{}'::text[]) into v_alignment_items
  from (
    select left(trim(item), 80) as value
    from unnest(coalesce(p_alignment_items, '{}'::text[])) as item
    where trim(item) <> ''
    limit 8
  ) items;

  if v_report.survey_kind = 'profile_check' and p_lesson_was_held then
    if p_profile_matched is null then raise exception 'プロフィールどおりの授業だったかを選択してください'; end if;
    if p_teacher_rating is null or p_teacher_rating not between 1 and 5 then raise exception '先生の評価を5段階で選択してください'; end if;
  end if;

  update public.lesson_feedback_reports
  set lesson_was_held = p_lesson_was_held,
      issue_reasons = v_issue_reasons,
      profile_matched = case when survey_kind = 'profile_check' and p_lesson_was_held then p_profile_matched else null end,
      alignment_items = case when survey_kind = 'profile_check' and p_lesson_was_held then v_alignment_items else '{}'::text[] end,
      teacher_rating = case when survey_kind = 'profile_check' and p_lesson_was_held then p_teacher_rating else null end,
      review_comment = case when survey_kind = 'profile_check' and p_lesson_was_held then nullif(left(trim(coalesce(p_review_comment, '')), 500), '') else null end,
      report_status = 'submitted',
      submitted_at = now()
  where id = v_report.id;

  -- 生徒の提出後にだけ実績を集計する。
  if v_report.respondent_role = 'student' then
    select id into v_teacher_profile_id from public.teacher_profiles where user_id = v_reservation.teacher_user_id;
    if v_teacher_profile_id is not null then
      update public.teacher_metrics metrics
      set total_lessons = coalesce((
            select count(*)::integer
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student' and feedback.report_status = 'submitted'
              and feedback.lesson_was_held is true and reservation.teacher_user_id = v_reservation.teacher_user_id
          ), 0),
          season_lessons = coalesce((
            select count(*)::integer
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student' and feedback.report_status = 'submitted'
              and feedback.lesson_was_held is true and reservation.teacher_user_id = v_reservation.teacher_user_id
              and reservation.completed_at at time zone 'Asia/Tokyo' >= date_trunc('year', now() at time zone 'Asia/Tokyo')
          ), 0),
          profile_match_rate = (
            select round(avg(case when feedback.profile_matched then 100::numeric else 0::numeric end), 2)
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student' and feedback.report_status = 'submitted'
              and feedback.survey_kind = 'profile_check' and feedback.profile_matched is not null
              and reservation.teacher_user_id = v_reservation.teacher_user_id
          ),
          average_rating = (
            select round(avg(feedback.teacher_rating)::numeric, 2)
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student' and feedback.report_status = 'submitted'
              and feedback.teacher_rating is not null and reservation.teacher_user_id = v_reservation.teacher_user_id
          ),
          rating_count = (
            select count(*)::integer
            from public.lesson_feedback_reports feedback
            join public.lesson_reservations reservation on reservation.id = feedback.reservation_id
            where feedback.respondent_role = 'student' and feedback.report_status = 'submitted'
              and feedback.teacher_rating is not null and reservation.teacher_user_id = v_reservation.teacher_user_id
          )
      where metrics.teacher_profile_id = v_teacher_profile_id;
    end if;
  end if;
end; $$;

revoke all on function public.submit_lesson_feedback_report(uuid, boolean, text[], boolean, text[], text, smallint) from public;
grant execute on function public.submit_lesson_feedback_report(uuid, boolean, text[], boolean, text[], text, smallint) to authenticated;
