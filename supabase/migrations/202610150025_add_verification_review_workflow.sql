-- 証明書ファイルは private Storage にだけ置き、提出履歴と最終確認状態を分離する。
create table if not exists public.teacher_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  teacher_user_id uuid not null references public.user_profiles(id) on delete cascade,
  submission_type text not null check (submission_type in ('education', 'qualification', 'mock_exam')),
  item_name text not null check (char_length(item_name) between 1 and 160),
  note text check (char_length(coalesce(note, '')) <= 1000),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 8388608),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'returned', 'rejected')),
  review_reason text check (char_length(coalesce(review_reason, '')) <= 1000),
  reviewed_by uuid references public.user_profiles(id),
  reviewed_at timestamptz,
  file_delete_after timestamptz,
  file_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_verification_submissions_teacher_idx on public.teacher_verification_submissions (teacher_user_id, created_at desc);
create index if not exists teacher_verification_submissions_review_idx on public.teacher_verification_submissions (review_status, created_at asc);

create table if not exists public.teacher_verification_review_audit (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.teacher_verification_submissions(id) on delete cascade,
  actor_user_id uuid not null references public.user_profiles(id),
  action text not null check (action in ('approved', 'returned', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists teacher_verification_audit_submission_idx on public.teacher_verification_review_audit (submission_id, created_at desc);

create or replace function public.is_mfa_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role::text = 'admin')
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

alter table public.teacher_verification_submissions enable row level security;
alter table public.teacher_verification_review_audit enable row level security;

create policy "Teachers can read their own verification submissions"
on public.teacher_verification_submissions for select to authenticated
using (teacher_user_id = auth.uid());

create policy "MFA admins can read verification submissions"
on public.teacher_verification_submissions for select to authenticated
using (public.is_mfa_admin());

create policy "MFA admins can update verification submissions"
on public.teacher_verification_submissions for update to authenticated
using (public.is_mfa_admin()) with check (public.is_mfa_admin());

create policy "MFA admins can read verification audit"
on public.teacher_verification_review_audit for select to authenticated
using (public.is_mfa_admin());

-- 既存の「本人が private bucket を直接読む／書く」経路を閉じる。
drop policy if exists "Users can read their own verification documents" on storage.objects;
drop policy if exists "Users can upload their own verification documents" on storage.objects;

create or replace function public.purge_expired_verification_files()
returns integer language plpgsql security definer set search_path = public as $$
declare removed_count integer;
begin
  with expired as (
    select id, storage_path from public.teacher_verification_submissions
    where file_purged_at is null and file_delete_after is not null and file_delete_after <= now()
  ), removed as (
    delete from storage.objects object_row using expired
    where object_row.bucket_id = 'verification-documents' and object_row.name = expired.storage_path
    returning object_row.name
  )
  update public.teacher_verification_submissions submission
  set file_purged_at = now(), updated_at = now()
  where submission.id in (select id from expired);
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all on function public.is_mfa_admin() from public;
revoke all on function public.purge_expired_verification_files() from public;
