-- Security hardening for public Edge Function endpoints and profile images.
-- Browser roles must never write directly to the public avatar bucket.

create table if not exists public.edge_rate_limits (
  scope text not null check (scope in ('password-login-ip', 'password-login-email-ip', 'inquiry-ip', 'inquiry-email', 'avatar-upload-ip', 'avatar-upload-user')),
  subject_hash text not null check (char_length(subject_hash) = 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash)
);

alter table public.edge_rate_limits enable row level security;
-- No anon/authenticated policy: only the server-side Edge Functions use this table.

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
  if p_scope not in ('password-login-ip', 'password-login-email-ip', 'inquiry-ip', 'inquiry-email', 'avatar-upload-ip', 'avatar-upload-user')
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

-- Only the authenticated upload Edge Function can add or replace public images.
drop policy if exists "Users can upload their own profile images" on storage.objects;
drop policy if exists "Users can update their own profile images" on storage.objects;
drop policy if exists "Users can delete their own profile images" on storage.objects;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-images';

-- Avatar paths must belong to the profile owner. This prevents a client from
-- pointing its public profile at another user's uploaded image.
create or replace function public.validate_teacher_avatar_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.avatar_path is not null
     and new.avatar_path !~ ('^' || new.user_id::text || '/avatar-([0-9]{13}|[0-9a-f-]{36})\.(jpg|png|webp)$') then
    raise exception 'Invalid avatar path';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_teacher_avatar_path on public.teacher_profiles;
create trigger validate_teacher_avatar_path
before insert or update of avatar_path, user_id on public.teacher_profiles
for each row execute procedure public.validate_teacher_avatar_path();
