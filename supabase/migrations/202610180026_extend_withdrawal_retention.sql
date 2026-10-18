-- 退会後は90日間だけ復帰できる猶予を設ける。
-- この期間中は account_status = 'withdrawn' のままで、公開・ログイン後の通常利用は不可。
alter table public.account_deletion_requests
  alter column account_data_purge_after set default (now() + interval '90 days');

-- 既存の未完了リクエストも、申請日から90日へ統一する。
update public.account_deletion_requests
set account_data_purge_after = requested_at + interval '90 days'
where completed_at is null;

-- 退会した運営者アカウントを将来削除する場合にも、監査履歴は残せるようにする。
alter table public.teacher_verification_review_audit
  alter column actor_user_id drop not null;

alter table public.teacher_verification_review_audit
  drop constraint if exists teacher_verification_review_audit_actor_user_id_fkey;

alter table public.teacher_verification_review_audit
  add constraint teacher_verification_review_audit_actor_user_id_fkey
  foreign key (actor_user_id) references public.user_profiles(id) on delete set null;

-- 承認者・確認者が退会しても、提出結果自体を壊さない。
alter table public.teacher_verifications
  drop constraint if exists teacher_verifications_verified_by_fkey;

alter table public.teacher_verifications
  add constraint teacher_verifications_verified_by_fkey
  foreign key (verified_by) references public.user_profiles(id) on delete set null;

alter table public.teacher_label_requests
  drop constraint if exists teacher_label_requests_reviewed_by_fkey;

alter table public.teacher_label_requests
  add constraint teacher_label_requests_reviewed_by_fkey
  foreign key (reviewed_by) references public.user_profiles(id) on delete set null;

alter table public.teacher_verification_submissions
  drop constraint if exists teacher_verification_submissions_reviewed_by_fkey;

alter table public.teacher_verification_submissions
  add constraint teacher_verification_submissions_reviewed_by_fkey
  foreign key (reviewed_by) references public.user_profiles(id) on delete set null;
