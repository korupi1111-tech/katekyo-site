-- Keep directory profiles in the same information shape as the featured site-owner profile.
alter table public.teacher_directory
  add column if not exists education text,
  add column if not exists gender text,
  add column if not exists teaching_experience text,
  add column if not exists qualifications text[] not null default '{}',
  add column if not exists mock_exam_result text,
  add column if not exists highest_rank text not null default 'R',
  add column if not exists contact_method text,
  add column if not exists target_label text,
  add column if not exists strengths text[] not null default '{}',
  add column if not exists limitations text[] not null default '{}',
  add column if not exists teaching_policy text;

update public.teacher_directory
set
  education = '明治大学 理工学部2年', gender = '女性', teaching_experience = '指導歴2年',
  qualifications = array['数学検定準1級'], mock_exam_result = '河合全統記述 数学偏差値72', highest_rank = 'UR',
  contact_method = 'オンライン通話・対面', target_label = '高校数学・大学受験',
  strengths = array['初見問題の方針づくり', '途中式の言語化'], limitations = array['公式の網羅講義', '解法の丸暗記'],
  teaching_policy = '正解よりも、次の問題で再現できる考え方を残します。'
where id = '10000000-0000-4000-8000-000000000001';

update public.teacher_directory
set
  education = '青山学院大学 国際政治経済学部3年', gender = '女性', teaching_experience = '指導歴3年',
  qualifications = array['英検1級', 'IELTS 7.5'], mock_exam_result = '英検1級 合格', highest_rank = 'LR',
  contact_method = 'オンライン通話・添削', target_label = '英検2級〜1級',
  strengths = array['英検ライティング', '論理構成の添削'], limitations = array['中学文法の初学者講義', 'TOEIC Part別対策'],
  teaching_policy = '難しい表現より、採点者が一度で追える論理を優先します。'
where id = '10000000-0000-4000-8000-000000000002';

update public.teacher_directory
set
  education = '東洋大学 文学部4年', gender = '男性', teaching_experience = '指導歴4年',
  qualifications = array['共通テスト日本史96点', '河合全統偏差値74'], mock_exam_result = '河合全統 日本史偏差値74', highest_rank = 'GOD',
  contact_method = 'オンライン通話', target_label = '共通テスト〜MARCH日本史',
  strengths = array['因果関係の整理', '論述対策'], limitations = array['一問一答だけの暗記', '語呂合わせ中心の短期指導'],
  teaching_policy = '覚える前に、なぜその出来事が起きたのかを説明できる状態を作ります。'
where id = '10000000-0000-4000-8000-000000000003';

update public.teacher_directory
set
  education = '法政大学 経営学部4年', gender = '男性', teaching_experience = '指導歴4年',
  qualifications = array['中学受験経験', '個別指導経験'], mock_exam_result = '四谷大塚合不合判定模試 算数偏差値68', highest_rank = 'GOD',
  contact_method = 'オンライン通話・対面', target_label = '中学受験・文章題・図形',
  strengths = array['文章題の図解', '条件整理'], limitations = array['解法パターンの丸暗記', '最難関問題だけの指導'],
  teaching_policy = '式を立てる前に、問題の状況を本人の手で見える形にします。'
where id = '10000000-0000-4000-8000-000000000004';

update public.teacher_directory
set
  education = '日本大学 文理学部2年', gender = '非公開', teaching_experience = '指導歴1年',
  qualifications = array['教職課程履修中'], mock_exam_result = null, highest_rank = 'SR',
  contact_method = 'オンライン通話・対面・メッセージ', target_label = '中学生・学習習慣',
  strengths = array['週間計画', '進捗確認'], limitations = array['毎日の強制監視', '長時間の一方的な講義'],
  teaching_policy = '完璧な計画より、今日始められる最小単位を作ります。'
where id = '10000000-0000-4000-8000-000000000005';
