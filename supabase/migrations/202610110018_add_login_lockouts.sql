-- ログイン失敗の状態はサーバーだけが扱う。メールアドレス本文は保存しない。
create table if not exists public.login_lockouts (
  email_hash text primary key,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_lockouts enable row level security;
-- クライアントへはポリシーを与えない。ログイン用Edge Functionのservice_roleだけが操作する。

create index if not exists login_lockouts_locked_until_idx on public.login_lockouts (locked_until)
where locked_until is not null;
