-- Fix verification failures when an existing user_profiles.role column uses
-- PostgreSQL's `name` type rather than the later account_role enum.
-- Compare through text so either schema can safely handle an Auth update.

create or replace function public.sync_account_auth_state()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.user_profiles
  set email_verified_at = new.email_confirmed_at,
      phone_verified_at = new.phone_confirmed_at,
      account_status = case
        when account_status::text in ('suspended', 'withdrawn', 'review_pending') then account_status
        when new.email_confirmed_at is null then 'pending_email'
        when role::text = 'teacher' and new.phone_confirmed_at is null then 'pending_phone'
        else 'active'
      end
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_verification_changed on auth.users;
create trigger on_auth_user_verification_changed
after update of email_confirmed_at, phone_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is distinct from new.email_confirmed_at
   or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
execute function public.sync_account_auth_state();
