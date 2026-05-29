-- Mini markeit user profiles setup
-- Run this in Supabase SQL Editor once.

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  email text,
  provider text not null default 'sms',
  is_online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Admin can read user profiles" on public.user_profiles;
create policy "Admin can read user profiles"
on public.user_profiles
for select
to authenticated
using (true);

create index if not exists user_profiles_phone_idx on public.user_profiles(phone);
create index if not exists user_profiles_created_at_idx on public.user_profiles(created_at desc);

-- Add this upsert inside the verify-otp Edge Function after the OTP is marked used:
--
-- await supabase.from("user_profiles").upsert(
--   {
--     phone,
--     provider: "sms",
--     is_online: true,
--     last_seen: new Date().toISOString(),
--     updated_at: new Date().toISOString(),
--   },
--   { onConflict: "phone" },
-- );
