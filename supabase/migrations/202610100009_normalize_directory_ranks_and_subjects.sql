-- The early directory should only expose ranks that are currently defined for launch.
alter table public.teacher_directory
  add column if not exists other_subjects text[] not null default '{}',
  add column if not exists extra_subjects text[] not null default '{}';

update public.teacher_directory
set
  current_rank = case
    when id = '10000000-0000-4000-8000-000000000005' then 'SR'
    else 'SSR'
  end,
  highest_rank = case
    when id = '10000000-0000-4000-8000-000000000005' then 'SR'
    else 'SSR'
  end,
  other_subjects = case id
    when '10000000-0000-4000-8000-000000000001' then array['中学数学', '物理基礎']
    when '10000000-0000-4000-8000-000000000002' then array['小論文']
    when '10000000-0000-4000-8000-000000000003' then array['現代文']
    when '10000000-0000-4000-8000-000000000004' then array['中学受験理科', '小学生国語']
    when '10000000-0000-4000-8000-000000000005' then array['中学国語']
    else '{}'
  end,
  extra_subjects = case id
    when '10000000-0000-4000-8000-000000000001' then array['定期試験相談']
    when '10000000-0000-4000-8000-000000000002' then array['英検面接', '学校英作文']
    when '10000000-0000-4000-8000-000000000003' then array['世界史基礎', 'MARCH対策']
    when '10000000-0000-4000-8000-000000000004' then array['学習計画', '塾教材整理']
    when '10000000-0000-4000-8000-000000000005' then array['中学英語', '定期試験相談']
    else '{}'
  end
where is_demo = true;
