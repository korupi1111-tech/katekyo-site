-- プライバシーポリシーに合わせ、退会後の復帰猶予とアカウント情報の保持を30日へ短縮する。
alter table public.account_deletion_requests
  alter column account_data_purge_after set default (now() + interval '30 days');

-- 未完了の退会リクエストも、申請日から30日へ統一する。
update public.account_deletion_requests
set account_data_purge_after = requested_at + interval '30 days'
where completed_at is null;
