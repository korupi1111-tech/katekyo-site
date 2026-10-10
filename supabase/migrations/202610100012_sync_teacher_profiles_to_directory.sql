-- 講師本人が入力する公開プロフィールの検索用ラベル。
-- 検索用テーブルはクライアントから直接更新せず、このプロフィールを正として同期する。
alter table public.teacher_profiles
  add column if not exists qualification_labels text[] not null default '{}',
  add column if not exists subjects text[] not null default '{}',
  add column if not exists topics text[] not null default '{}',
  add column if not exists levels text[] not null default '{}',
  add column if not exists lesson_types text[] not null default '{}',
  add column if not exists contact_methods text[] not null default '{}',
  add column if not exists lesson_styles text[] not null default '{}',
  add column if not exists supports_in_person boolean not null default false,
  add column if not exists prefecture text,
  add column if not exists city text,
  add column if not exists free_consultation boolean not null default false,
  add column if not exists initial_free boolean not null default false;

alter table public.teacher_directory
  add column if not exists teacher_profile_id uuid unique references public.teacher_profiles(id) on delete cascade,
  add column if not exists qualification_labels text[] not null default '{}';

-- Member profiles remain searchable only while the owning teacher account is
-- eligible for public display. Demo rows keep their existing public behavior.
drop policy if exists "Published directory profiles are publicly visible" on public.teacher_directory;
create policy "Eligible directory profiles are publicly visible"
on public.teacher_directory for select to anon, authenticated
using (
  is_published
  and (
    is_demo
    or exists (
      select 1 from public.teacher_profiles profile
      where profile.id = teacher_profile_id
        and profile.is_published
        and public.is_public_teacher(profile.user_id)
    )
  )
);

-- Existing demo records also use the same qualification taxonomy so that the
-- directory's qualification filters behave consistently before member profiles
-- are added.
update public.teacher_directory
set qualification_labels = coalesce(nullif(array_remove(array[
  case when qualifications && array['英検1級', '英検準1級', '英検2級', '英検準2級', '英検3級', '英検4級', '英検5級'] then '英語資格' end,
  case when qualifications && array['英検1級', '英検準1級', '英検2級', '英検準2級', '英検3級', '英検4級', '英検5級'] then '英検' end,
  case when array_to_string(qualifications, ' ') ilike '%TOEIC%' then '英語資格' end,
  case when array_to_string(qualifications, ' ') ilike '%TOEIC%' then 'TOEIC' end,
  case when array_to_string(qualifications, ' ') ilike '%TOEFL%' then '英語資格' end,
  case when array_to_string(qualifications, ' ') ilike '%TOEFL%' then 'TOEFL' end,
  case when array_to_string(qualifications, ' ') ilike '%IELTS%' then '英語資格' end,
  case when array_to_string(qualifications, ' ') ilike '%IELTS%' then 'IELTS' end,
  case when array_to_string(qualifications, ' ') ilike '%数学検定%' then '数学資格' end,
  case when array_to_string(qualifications, ' ') ilike '%数学検定%' then '数学検定' end,
  case when array_to_string(qualifications, ' ') ilike '%漢字検定%' then '国語資格' end,
  case when array_to_string(qualifications, ' ') ilike '%漢字検定%' then '漢字検定' end,
  case when array_to_string(qualifications, ' ') ilike '%日本語検定%' then '国語資格' end,
  case when array_to_string(qualifications, ' ') ilike '%日本語検定%' then '日本語検定' end,
  case when array_to_string(qualifications, ' ') ilike '%教員免許%' then '教職・教育' end,
  case when array_to_string(qualifications, ' ') ilike '%教員免許%' then '教員免許' end,
  case when array_to_string(qualifications, ' ') ilike '%指導%' then '指導経験' end
]::text[], null), '{}'::text[]), array['その他'])
where qualification_labels = '{}';

-- This function is only invoked by database triggers below. EXECUTE is revoked
-- from PUBLIC so no browser client can call it to write somebody else's directory row.
create or replace function public.sync_teacher_profile_to_directory(profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record public.teacher_profiles%rowtype;
  metrics_record public.teacher_metrics%rowtype;
  verification_record public.teacher_verifications%rowtype;
begin
  select * into profile_record from public.teacher_profiles where id = profile_id;
  if not found then return; end if;
  select * into metrics_record from public.teacher_metrics where teacher_profile_id = profile_id;
  select * into verification_record from public.teacher_verifications where teacher_profile_id = profile_id;

  insert into public.teacher_directory (
    teacher_profile_id, is_demo, is_published, display_name, catchphrase, main_subject,
    qualification_labels, subjects, topics, levels, lesson_types, contact_methods, teaching_types, lesson_styles,
    supports_in_person, prefecture, city, recruitment_status, price_yen, free_consultation,
    initial_free, education_verified, qualification_verified, mock_exam_verified, current_rank,
    highest_rank, verified_lesson_count, total_lesson_count, profile_match_rate, summary,
    education, gender, teaching_experience, qualifications, mock_exam_result, contact_method,
    target_label, strengths, limitations, teaching_policy, other_subjects, extra_subjects
  ) values (
    profile_record.id, false, profile_record.is_published, profile_record.display_name,
    profile_record.catchphrase, coalesce(profile_record.main_subject, 'その他'),
    profile_record.qualification_labels, profile_record.subjects, profile_record.topics, profile_record.levels,
    profile_record.lesson_types, profile_record.contact_methods, profile_record.teaching_types,
    profile_record.lesson_styles, profile_record.supports_in_person, profile_record.prefecture,
    profile_record.city, coalesce(profile_record.recruitment_status, '募集停止中'),
    coalesce(profile_record.price_yen, 0), profile_record.free_consultation,
    profile_record.initial_free, coalesce(verification_record.education_verified, false),
    coalesce(verification_record.qualifications_verified, false),
    coalesce(verification_record.mock_exam_verified, false),
    coalesce(metrics_record.current_rank::text, 'R'), coalesce(metrics_record.highest_rank::text, 'R'),
    coalesce(metrics_record.season_lessons, 0), coalesce(metrics_record.total_lessons, 0),
    metrics_record.profile_match_rate, profile_record.teacher_message, profile_record.education,
    profile_record.gender, profile_record.teaching_experience, profile_record.qualifications,
    profile_record.mock_exam_result, profile_record.contact_method,
    array_to_string(profile_record.target_students, '・'), profile_record.strengths,
    profile_record.limitations, profile_record.teaching_policy, profile_record.other_subjects,
    profile_record.extra_subjects
  ) on conflict (teacher_profile_id) do update set
    is_published = excluded.is_published, display_name = excluded.display_name,
    catchphrase = excluded.catchphrase, main_subject = excluded.main_subject,
    qualification_labels = excluded.qualification_labels, subjects = excluded.subjects,
    topics = excluded.topics, levels = excluded.levels,
    lesson_types = excluded.lesson_types, contact_methods = excluded.contact_methods,
    teaching_types = excluded.teaching_types, lesson_styles = excluded.lesson_styles,
    supports_in_person = excluded.supports_in_person, prefecture = excluded.prefecture,
    city = excluded.city, recruitment_status = excluded.recruitment_status,
    price_yen = excluded.price_yen, free_consultation = excluded.free_consultation,
    initial_free = excluded.initial_free, education_verified = excluded.education_verified,
    qualification_verified = excluded.qualification_verified,
    mock_exam_verified = excluded.mock_exam_verified, current_rank = excluded.current_rank,
    highest_rank = excluded.highest_rank, verified_lesson_count = excluded.verified_lesson_count,
    total_lesson_count = excluded.total_lesson_count, profile_match_rate = excluded.profile_match_rate,
    summary = excluded.summary, education = excluded.education, gender = excluded.gender,
    teaching_experience = excluded.teaching_experience, qualifications = excluded.qualifications,
    mock_exam_result = excluded.mock_exam_result, contact_method = excluded.contact_method,
    target_label = excluded.target_label, strengths = excluded.strengths,
    limitations = excluded.limitations, teaching_policy = excluded.teaching_policy,
    other_subjects = excluded.other_subjects, extra_subjects = excluded.extra_subjects;
end;
$$;

create or replace function public.sync_teacher_profile_directory_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_teacher_profile_to_directory(new.id);
  return new;
end;
$$;

create or replace function public.sync_teacher_metrics_directory_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_teacher_profile_to_directory(new.teacher_profile_id);
  return new;
end;
$$;

drop trigger if exists on_teacher_profile_directory_sync on public.teacher_profiles;
create trigger on_teacher_profile_directory_sync
after insert or update on public.teacher_profiles
for each row execute function public.sync_teacher_profile_directory_trigger();

drop trigger if exists on_teacher_metrics_directory_sync on public.teacher_metrics;
create trigger on_teacher_metrics_directory_sync
after insert or update on public.teacher_metrics
for each row execute function public.sync_teacher_metrics_directory_trigger();

drop trigger if exists on_teacher_verifications_directory_sync on public.teacher_verifications;
create trigger on_teacher_verifications_directory_sync
after insert or update on public.teacher_verifications
for each row execute function public.sync_teacher_metrics_directory_trigger();

revoke all on function public.sync_teacher_profile_to_directory(uuid) from public;
revoke all on function public.sync_teacher_profile_directory_trigger() from public;
revoke all on function public.sync_teacher_metrics_directory_trigger() from public;

-- 既存の講師プロフィールがある場合にも、一度検索用データを作る。
select public.sync_teacher_profile_to_directory(id) from public.teacher_profiles;
