-- メールアドレスは連絡先として保持し、ログインの本人確認には使用しない。
alter table public.user_profiles
  add column if not exists contact_email text;

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, contact_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'contact_email', '')
  );
  return new;
end;
$$;
