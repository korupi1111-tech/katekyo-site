alter table public.teacher_directory
  add column if not exists total_lesson_count integer not null default 0
  check (total_lesson_count >= 0);

update public.teacher_directory
set total_lesson_count = case id
  when '10000000-0000-4000-8000-000000000001' then 164
  when '10000000-0000-4000-8000-000000000002' then 221
  when '10000000-0000-4000-8000-000000000003' then 308
  when '10000000-0000-4000-8000-000000000004' then 190
  when '10000000-0000-4000-8000-000000000005' then 53
  when '10000000-0000-4000-8000-000000000006' then 76
  when '10000000-0000-4000-8000-000000000007' then 129
  when '10000000-0000-4000-8000-000000000008' then 36
  when '10000000-0000-4000-8000-000000000009' then 49
  when '10000000-0000-4000-8000-000000000010' then 112
  else total_lesson_count
end
where is_demo = true;
