-- Public search directory. Demo instructors live here without requiring auth accounts.
-- Real teacher profiles can be copied here by an admin review flow in a later migration.
create table public.teacher_directory (
  id uuid primary key default gen_random_uuid(),
  is_demo boolean not null default true,
  is_published boolean not null default false,
  display_name text not null check (char_length(display_name) between 1 and 80),
  catchphrase text not null check (char_length(catchphrase) between 1 and 160),
  main_subject text not null,
  subjects text[] not null default '{}',
  topics text[] not null default '{}',
  levels text[] not null default '{}',
  lesson_types text[] not null default '{}',
  contact_methods text[] not null default '{}',
  teaching_types text[] not null default '{}',
  lesson_styles text[] not null default '{}',
  supports_in_person boolean not null default false,
  prefecture text,
  city text,
  recruitment_status text not null default '受付中',
  price_yen integer not null check (price_yen >= 0),
  free_consultation boolean not null default false,
  initial_free boolean not null default false,
  education_verified boolean not null default false,
  qualification_verified boolean not null default false,
  mock_exam_verified boolean not null default false,
  current_rank text not null default 'R',
  verified_lesson_count integer not null default 0 check (verified_lesson_count >= 0),
  profile_match_rate numeric(5,2) check (profile_match_rate is null or profile_match_rate between 0 and 100),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teacher_directory_public_search_idx
  on public.teacher_directory (is_published, main_subject, recruitment_status, price_yen);

create trigger set_teacher_directory_updated_at
before update on public.teacher_directory
for each row execute function public.set_updated_at();

alter table public.teacher_directory enable row level security;

create policy "Published directory profiles are publicly visible"
on public.teacher_directory for select to anon, authenticated
using (is_published = true);

insert into public.teacher_directory (
  id, is_demo, is_published, display_name, catchphrase, main_subject, subjects, topics, levels,
  lesson_types, contact_methods, teaching_types, lesson_styles, supports_in_person, prefecture, city,
  recruitment_status, price_yen, free_consultation, initial_free, education_verified,
  qualification_verified, mock_exam_verified, current_rank, verified_lesson_count, profile_match_rate, summary
) values
  ('10000000-0000-4000-8000-000000000001', true, true, '佐藤 陽菜', '初見問題の方針を作る数学', '高校数学',
   array['高校数学', '中学数学'], array['文章題', '図形', '共通テスト対策'], array['定期テスト', '大学受験', '難関大学受験'],
   array['長期指導', '質問対応'], array['オンライン通話', '対面'], array['理論型', '演習型'], array['質問重視', 'アウトプット重視'], true, '東京都', '江東区',
   '受付中', 1800, false, false, true, true, true, 'SSR', 88, 92, '完成した解法を渡す前に、方針を選ぶ根拠を言葉にします。'),
  ('10000000-0000-4000-8000-000000000002', true, true, '高橋 美月', '英検ライティングの論理添削', '高校英語',
   array['高校英語', '中学英語'], array['英作文・ライティング', '英検対策', '過去問指導'], array['高校受験', '大学受験', '英検2級', '英検準1級', '英検1級'],
   array['単発授業', '添削', '質問対応'], array['オンライン通話', '添削のみ'], array['理論型'], array['添削重視', 'アウトプット重視'], false, null, null,
   '受付中', 3200, true, false, true, true, true, 'UR', 156, 96, '英文を主張・理由・具体例へ分け、論理の不足と飛躍を整えます。'),
  ('10000000-0000-4000-8000-000000000003', true, true, '山本 蒼', '因果関係でつなぐ日本史', '日本史',
   array['日本史', '現代文'], array['共通テスト対策', '過去問指導'], array['共通テスト', '大学受験', '難関大学受験'],
   array['長期指導', '単発授業'], array['オンライン通話'], array['理論型'], array['精読重視', '対話重視'], false, null, null,
   '残り1枠', 4500, false, false, true, true, true, 'GOD', 286, 98, '用語を増やす前に、すでに知っている出来事を因果関係でつなぎ直します。'),
  ('10000000-0000-4000-8000-000000000004', true, true, '鈴木 直人', '文章題を図へ変える中学受験算数', '中学数学',
   array['中学数学', '高校数学'], array['文章題', '図形', '定期テスト対策'], array['基礎から', '定期テスト', '高校受験'],
   array['長期指導', '質問対応'], array['オンライン通話', '対面'], array['演習型'], array['質問重視', 'アウトプット重視'], true, '東京都', '新宿区',
   '受付中', 3800, false, true, true, false, false, 'LR', 211, 97, '式を立てる前に、問題の状況を図として見える形にします。'),
  ('10000000-0000-4000-8000-000000000005', true, true, '伊藤 葵', '宿題を始められない中学生の学習管理', '学習管理',
   array['中学英語', '中学数学'], array['定期テスト対策'], array['基礎から', '定期テスト'],
   array['学習相談', '長期指導', '進路相談'], array['オンライン通話', '対面', 'メッセージ'], array['その他'], array['対話重視', '生徒に合わせて変更'], true, '東京都', '世田谷区',
   '受付中', 1500, true, false, false, false, false, 'SR', 19, 94, '完璧な計画ではなく、今日から始められる最小単位を一緒に作ります。')
on conflict (id) do update set
  is_published = excluded.is_published,
  display_name = excluded.display_name,
  catchphrase = excluded.catchphrase,
  main_subject = excluded.main_subject,
  subjects = excluded.subjects,
  topics = excluded.topics,
  levels = excluded.levels,
  lesson_types = excluded.lesson_types,
  contact_methods = excluded.contact_methods,
  teaching_types = excluded.teaching_types,
  lesson_styles = excluded.lesson_styles,
  supports_in_person = excluded.supports_in_person,
  prefecture = excluded.prefecture,
  city = excluded.city,
  recruitment_status = excluded.recruitment_status,
  price_yen = excluded.price_yen,
  free_consultation = excluded.free_consultation,
  initial_free = excluded.initial_free,
  education_verified = excluded.education_verified,
  qualification_verified = excluded.qualification_verified,
  mock_exam_verified = excluded.mock_exam_verified,
  current_rank = excluded.current_rank,
  verified_lesson_count = excluded.verified_lesson_count,
  profile_match_rate = excluded.profile_match_rate,
  summary = excluded.summary;
