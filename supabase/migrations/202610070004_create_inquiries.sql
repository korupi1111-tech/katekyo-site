-- Public inquiry submissions are written only by the Edge Function using service_role.
-- No browser role receives a policy for this table.
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 80),
  sender_email text not null check (char_length(sender_email) between 3 and 254),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists inquiries_sender_email_created_at_idx
on public.inquiries (sender_email, created_at desc);

alter table public.inquiries enable row level security;
