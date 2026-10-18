-- プロフィール上部の資格・対象範囲と、曜日ごとの対応可能時間。
alter table public.teacher_profiles
  add column if not exists target_level text,
  add column if not exists top_qualifications text[] not null default '{}';

alter table public.teacher_directory
  add column if not exists target_level text,
  add column if not exists top_qualifications text[] not null default '{}',
  add column if not exists other_qualifications text[] not null default '{}',
  add column if not exists recommended_for text[] not null default '{}',
  add column if not exists not_recommended_for text[] not null default '{}';

create table if not exists public.teacher_weekly_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  created_at timestamptz not null default now(),
  unique (teacher_profile_id, weekday, starts_at, ends_at)
);

create index if not exists teacher_weekly_availability_public_idx
  on public.teacher_weekly_availability (teacher_profile_id, weekday, starts_at);

alter table public.teacher_weekly_availability enable row level security;

drop policy if exists "Public can read eligible teacher weekly availability" on public.teacher_weekly_availability;
create policy "Public can read eligible teacher weekly availability"
on public.teacher_weekly_availability for select to anon, authenticated
using (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.is_published and public.is_public_teacher(profile.user_id)));

drop policy if exists "Teachers can manage their own weekly availability" on public.teacher_weekly_availability;
create policy "Teachers can manage their own weekly availability"
on public.teacher_weekly_availability for all to authenticated
using (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid()))
with check (exists (select 1 from public.teacher_profiles profile where profile.id = teacher_profile_id and profile.user_id = auth.uid() and public.is_teacher_profile_enabled(auth.uid())));

create or replace function public.sync_teacher_profile_to_directory(profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare profile_record public.teacher_profiles%rowtype; metrics_record public.teacher_metrics%rowtype; verification_record public.teacher_verifications%rowtype;
begin
  select * into profile_record from public.teacher_profiles where id = profile_id; if not found then return; end if;
  select * into metrics_record from public.teacher_metrics where teacher_profile_id = profile_id;
  select * into verification_record from public.teacher_verifications where teacher_profile_id = profile_id;
  insert into public.teacher_directory (teacher_profile_id,is_demo,is_published,display_name,catchphrase,avatar_path,main_subject,qualification_labels,subjects,topics,levels,lesson_types,contact_methods,teaching_types,lesson_styles,supports_in_person,prefecture,city,recruitment_status,price_yen,free_consultation,initial_free,education_verified,qualification_verified,mock_exam_verified,current_rank,highest_rank,verified_lesson_count,total_lesson_count,profile_match_rate,summary,education,gender,teaching_experience,qualifications,mock_exam_result,contact_method,target_label,target_level,top_qualifications,other_qualifications,recommended_for,not_recommended_for,strengths,limitations,teaching_policy,other_subjects,extra_subjects)
  values (profile_record.id,false,profile_record.is_published,profile_record.display_name,profile_record.catchphrase,profile_record.avatar_path,coalesce(profile_record.main_subject,'その他'),profile_record.qualification_labels,profile_record.subjects,profile_record.topics,profile_record.levels,profile_record.lesson_types,profile_record.contact_methods,profile_record.teaching_types,profile_record.lesson_styles,profile_record.supports_in_person,profile_record.prefecture,profile_record.city,coalesce(profile_record.recruitment_status,'募集停止中'),coalesce(profile_record.price_yen,0),profile_record.free_consultation,profile_record.initial_free,coalesce(verification_record.education_verified,false),coalesce(verification_record.qualifications_verified,false),coalesce(verification_record.mock_exam_verified,false),coalesce(metrics_record.current_rank::text,'R'),coalesce(metrics_record.highest_rank::text,'R'),coalesce(metrics_record.season_lessons,0),coalesce(metrics_record.total_lessons,0),metrics_record.profile_match_rate,profile_record.teacher_message,profile_record.education,profile_record.gender,profile_record.teaching_experience,profile_record.qualifications,profile_record.mock_exam_result,profile_record.contact_method,array_to_string(profile_record.target_students,'・'),profile_record.target_level,profile_record.top_qualifications,array(select value from unnest(profile_record.qualifications) value where value not in ('英検5級','英検4級','英検3級','英検準2級','英検2級','英検準1級','英検1級','TOEIC L&R','TOEFL iBT','IELTS','数学検定','漢字検定','日本語検定','教員免許','教職課程履修中','中学受験経験','指導経験')),profile_record.recommended_for,profile_record.not_recommended_for,profile_record.strengths,profile_record.limitations,profile_record.teaching_policy,profile_record.other_subjects,profile_record.extra_subjects)
  on conflict (teacher_profile_id) do update set is_published=excluded.is_published,display_name=excluded.display_name,catchphrase=excluded.catchphrase,avatar_path=excluded.avatar_path,main_subject=excluded.main_subject,qualification_labels=excluded.qualification_labels,subjects=excluded.subjects,topics=excluded.topics,levels=excluded.levels,lesson_types=excluded.lesson_types,contact_methods=excluded.contact_methods,teaching_types=excluded.teaching_types,lesson_styles=excluded.lesson_styles,supports_in_person=excluded.supports_in_person,prefecture=excluded.prefecture,city=excluded.city,recruitment_status=excluded.recruitment_status,price_yen=excluded.price_yen,free_consultation=excluded.free_consultation,initial_free=excluded.initial_free,education_verified=excluded.education_verified,qualification_verified=excluded.qualification_verified,mock_exam_verified=excluded.mock_exam_verified,current_rank=excluded.current_rank,highest_rank=excluded.highest_rank,verified_lesson_count=excluded.verified_lesson_count,total_lesson_count=excluded.total_lesson_count,profile_match_rate=excluded.profile_match_rate,summary=excluded.summary,education=excluded.education,gender=excluded.gender,teaching_experience=excluded.teaching_experience,qualifications=excluded.qualifications,mock_exam_result=excluded.mock_exam_result,contact_method=excluded.contact_method,target_label=excluded.target_label,target_level=excluded.target_level,top_qualifications=excluded.top_qualifications,other_qualifications=excluded.other_qualifications,recommended_for=excluded.recommended_for,not_recommended_for=excluded.not_recommended_for,strengths=excluded.strengths,limitations=excluded.limitations,teaching_policy=excluded.teaching_policy,other_subjects=excluded.other_subjects,extra_subjects=excluded.extra_subjects;
end; $$;

select public.sync_teacher_profile_to_directory(id) from public.teacher_profiles;
