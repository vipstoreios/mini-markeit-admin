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
where email = 'admin@mini-markeit.com'
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
