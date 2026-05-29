-- Mini markeit Admin Dashboard setup
-- Run this in Supabase SQL Editor AFTER you create the admin user in Authentication > Users.

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

-- Change this email if you use another email for the admin account.
insert into public.admin_users (id, role)
select id, 'super_admin'
from auth.users
where email = 'goranamar77@gmail.com'
on conflict (id) do update set role = excluded.role;

-- Admin can manage everything needed by the dashboard.
do $$
begin
  if to_regclass('public.app_settings') is not null then
    execute 'drop policy if exists "admin_manage_app_settings" on public.app_settings';
    execute 'create policy "admin_manage_app_settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.categories') is not null then
    execute 'drop policy if exists "admin_manage_categories" on public.categories';
    execute 'create policy "admin_manage_categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.products') is not null then
    execute 'drop policy if exists "admin_manage_products" on public.products';
    execute 'create policy "admin_manage_products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.orders') is not null then
    execute 'drop policy if exists "admin_manage_orders" on public.orders';
    execute 'create policy "admin_manage_orders" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.order_items') is not null then
    execute 'drop policy if exists "admin_manage_order_items" on public.order_items';
    execute 'create policy "admin_manage_order_items" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- User profiles for customer accounts shown in the admin dashboard.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  provider text not null default 'email',
  last_seen timestamptz,
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- App menu / About settings controlled from dashboard.
alter table public.app_settings
  add column if not exists about_badini text,
  add column if not exists about_ar text,
  add column if not exists about_en text,
  add column if not exists logo_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text;

-- Optional: link orders to logged-in users while keeping guest checkout working.
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- User can manage only their own profile.
drop policy if exists "users_read_own_profile" on public.user_profiles;
create policy "users_read_own_profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "users_insert_own_profile" on public.user_profiles;
create policy "users_insert_own_profile"
on public.user_profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users_update_own_profile" on public.user_profiles;
create policy "users_update_own_profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- Admin can view and manage customer profiles in the dashboard.
drop policy if exists "admin_manage_user_profiles" on public.user_profiles;
create policy "admin_manage_user_profiles"
on public.user_profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin dashboard support/promo permissions if those tables exist.
do $$
begin
  if to_regclass('public.promo_codes') is not null then
    execute 'drop policy if exists "admin_manage_promo_codes" on public.promo_codes';
    execute 'create policy "admin_manage_promo_codes" on public.promo_codes for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.promo_code_products') is not null then
    execute 'drop policy if exists "admin_manage_promo_code_products" on public.promo_code_products';
    execute 'create policy "admin_manage_promo_code_products" on public.promo_code_products for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.support_chats') is not null then
    execute 'drop policy if exists "admin_manage_support_chats" on public.support_chats';
    execute 'create policy "admin_manage_support_chats" on public.support_chats for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.support_messages') is not null then
    execute 'drop policy if exists "admin_manage_support_messages" on public.support_messages';
    execute 'create policy "admin_manage_support_messages" on public.support_messages for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;
