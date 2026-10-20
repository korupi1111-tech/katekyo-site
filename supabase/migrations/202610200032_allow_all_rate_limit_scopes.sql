-- Edge Function が使うレート制限の種類を、すべて許可する。
-- 証明書提出・審査・予約メール・登録状態確認・退会からの復帰の5種類が未登録で、
-- 制限を記録する時点で制約違反になり、各機能が失敗していた。
alter table public.edge_rate_limits
  drop constraint if exists edge_rate_limits_scope_check;

alter table public.edge_rate_limits
  add constraint edge_rate_limits_scope_check check (scope in (
    'password-login-ip', 'password-login-email-ip',
    'inquiry-ip', 'inquiry-email',
    'avatar-upload-ip', 'avatar-upload-user',
    'verification-upload', 'verification-review',
    'reservation-email',
    'account-registration-state', 'restore-withdrawn-account'
  ));

-- 関数側にも同じ一覧があり、こちらも古いままだったため更新する。
create or replace function public.consume_edge_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if p_scope not in (
      'password-login-ip', 'password-login-email-ip',
      'inquiry-ip', 'inquiry-email',
      'avatar-upload-ip', 'avatar-upload-user',
      'verification-upload', 'verification-review',
      'reservation-email',
      'account-registration-state', 'restore-withdrawn-account'
    )
    or char_length(p_subject_hash) <> 64
    or p_limit < 1
    or p_window_seconds < 1 then
    raise exception 'Invalid rate limit arguments';
  end if;

  insert into public.edge_rate_limits (scope, subject_hash, window_started_at, request_count, updated_at)
  values (p_scope, p_subject_hash, now(), 1, now())
  on conflict (scope, subject_hash) do update
  set window_started_at = case
        when public.edge_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now() else public.edge_rate_limits.window_started_at end,
      request_count = case
        when public.edge_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1 else public.edge_rate_limits.request_count + 1 end,
      updated_at = now()
  returning request_count into next_count;

  return next_count <= p_limit;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, text, integer, integer) to service_role;
