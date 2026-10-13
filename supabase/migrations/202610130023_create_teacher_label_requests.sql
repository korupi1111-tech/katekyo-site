-- 講師が既存の検索ラベルにない内容を提案するための申請キュー。
-- 申請内容は公開検索には混ぜず、確認後に共通ラベルへ追加する。

create table if not exists public.teacher_label_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  requested_by uuid not null references public.user_profiles(id) on delete cascade,
  label_group text not null check (label_group in ('subjects', 'topics', 'levels', 'qualification_labels', 'teaching_types')),
  label_value text not null check (char_length(btrim(label_value)) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.user_profiles(id),
  unique (teacher_profile_id, label_group, label_value)
);

create index if not exists teacher_label_requests_status_idx
  on public.teacher_label_requests (status, created_at);

alter table public.teacher_label_requests enable row level security;

create policy "Teachers can submit their own label requests"
on public.teacher_label_requests for insert to authenticated
with check (
  requested_by = auth.uid()
  and public.is_teacher_feature_enabled(auth.uid())
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.id = teacher_profile_id and profile.user_id = auth.uid()
  )
);

create policy "Teachers can read their own label requests"
on public.teacher_label_requests for select to authenticated
using (requested_by = auth.uid());
