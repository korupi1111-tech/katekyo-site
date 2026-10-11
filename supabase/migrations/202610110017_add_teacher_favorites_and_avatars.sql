-- 生徒ごとのお気に入り講師。本人以外は参照・変更できない。
create table if not exists public.student_favorite_teachers (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.user_profiles(id) on delete cascade,
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_user_id, teacher_profile_id)
);

create index if not exists student_favorite_teachers_student_created_idx
  on public.student_favorite_teachers (student_user_id, created_at desc);

alter table public.student_favorite_teachers enable row level security;

drop policy if exists "Students can view their own favorite teachers" on public.student_favorite_teachers;
create policy "Students can view their own favorite teachers"
on public.student_favorite_teachers for select to authenticated
using (student_user_id = auth.uid());

drop policy if exists "Eligible students can add favorite teachers" on public.student_favorite_teachers;
create policy "Eligible students can add favorite teachers"
on public.student_favorite_teachers for insert to authenticated
with check (
  student_user_id = auth.uid()
  and exists (select 1 from public.user_profiles me where me.id = auth.uid() and me.role::text = 'student' and me.email_verified_at is not null)
  and exists (select 1 from public.teacher_profiles teacher where teacher.id = teacher_profile_id and teacher.is_published and public.is_public_teacher(teacher.user_id))
);

drop policy if exists "Students can remove their own favorite teachers" on public.student_favorite_teachers;
create policy "Students can remove their own favorite teachers"
on public.student_favorite_teachers for delete to authenticated
using (student_user_id = auth.uid());

-- 検索カードでも講師本人が登録したアイコンを表示する。
alter table public.teacher_directory add column if not exists avatar_path text;

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
    teacher_profile_id, is_demo, is_published, display_name, catchphrase, avatar_path, main_subject,
    qualification_labels, subjects, topics, levels, lesson_types, contact_methods, teaching_types, lesson_styles,
    supports_in_person, prefecture, city, recruitment_status, price_yen, free_consultation, initial_free,
    education_verified, qualification_verified, mock_exam_verified, current_rank, highest_rank,
    verified_lesson_count, total_lesson_count, profile_match_rate, summary, education, gender,
    teaching_experience, qualifications, mock_exam_result, contact_method, target_label, strengths,
    limitations, teaching_policy, other_subjects, extra_subjects
  ) values (
    profile_record.id, false, profile_record.is_published, profile_record.display_name, profile_record.catchphrase,
    profile_record.avatar_path, coalesce(profile_record.main_subject, 'その他'), profile_record.qualification_labels,
    profile_record.subjects, profile_record.topics, profile_record.levels, profile_record.lesson_types,
    profile_record.contact_methods, profile_record.teaching_types, profile_record.lesson_styles,
    profile_record.supports_in_person, profile_record.prefecture, profile_record.city,
    coalesce(profile_record.recruitment_status, '募集停止中'), coalesce(profile_record.price_yen, 0),
    profile_record.free_consultation, profile_record.initial_free, coalesce(verification_record.education_verified, false),
    coalesce(verification_record.qualifications_verified, false), coalesce(verification_record.mock_exam_verified, false),
    coalesce(metrics_record.current_rank::text, 'R'), coalesce(metrics_record.highest_rank::text, 'R'),
    coalesce(metrics_record.season_lessons, 0), coalesce(metrics_record.total_lessons, 0),
    metrics_record.profile_match_rate, profile_record.teacher_message, profile_record.education, profile_record.gender,
    profile_record.teaching_experience, profile_record.qualifications, profile_record.mock_exam_result,
    profile_record.contact_method, array_to_string(profile_record.target_students, '・'), profile_record.strengths,
    profile_record.limitations, profile_record.teaching_policy, profile_record.other_subjects, profile_record.extra_subjects
  ) on conflict (teacher_profile_id) do update set
    is_published = excluded.is_published, display_name = excluded.display_name, catchphrase = excluded.catchphrase,
    avatar_path = excluded.avatar_path, main_subject = excluded.main_subject,
    qualification_labels = excluded.qualification_labels, subjects = excluded.subjects, topics = excluded.topics,
    levels = excluded.levels, lesson_types = excluded.lesson_types, contact_methods = excluded.contact_methods,
    teaching_types = excluded.teaching_types, lesson_styles = excluded.lesson_styles,
    supports_in_person = excluded.supports_in_person, prefecture = excluded.prefecture, city = excluded.city,
    recruitment_status = excluded.recruitment_status, price_yen = excluded.price_yen,
    free_consultation = excluded.free_consultation, initial_free = excluded.initial_free,
    education_verified = excluded.education_verified, qualification_verified = excluded.qualification_verified,
    mock_exam_verified = excluded.mock_exam_verified, current_rank = excluded.current_rank,
    highest_rank = excluded.highest_rank, verified_lesson_count = excluded.verified_lesson_count,
    total_lesson_count = excluded.total_lesson_count, profile_match_rate = excluded.profile_match_rate,
    summary = excluded.summary, education = excluded.education, gender = excluded.gender,
    teaching_experience = excluded.teaching_experience, qualifications = excluded.qualifications,
    mock_exam_result = excluded.mock_exam_result, contact_method = excluded.contact_method,
    target_label = excluded.target_label, strengths = excluded.strengths, limitations = excluded.limitations,
    teaching_policy = excluded.teaching_policy, other_subjects = excluded.other_subjects,
    extra_subjects = excluded.extra_subjects;
end;
$$;

select public.sync_teacher_profile_to_directory(id) from public.teacher_profiles;
