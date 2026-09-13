-- =========================================================
-- Fix: infinite recursion in RLS policies
-- =========================================================
-- Root cause: policies like "admins full access categories" call
--   exists (select 1 from admins a where a.id = auth.uid() ...)
-- To evaluate that subquery, Postgres must apply RLS to `admins` itself.
-- One of admins' own policies ("admins manage admins") runs the exact same
-- kind of subquery against `admins` -- which triggers RLS on `admins` again,
-- forever. Postgres detects the cycle and raises:
--   "infinite recursion detected in policy for relation \"admins\""
--
-- This broke far more than the admin dashboard: because Postgres combines
-- all permissive policies for a table into one OR'd condition, even a plain
-- public SELECT on `categories` had to evaluate the (also present) admin
-- policy on categories to know whether to OR it in -- so the public menu
-- read failed too, even for a fully anonymous visitor.
--
-- Fix: move the admin-status check into a SECURITY DEFINER function. A
-- function owned by the migration-running role (postgres, which has
-- BYPASSRLS) executes with that role's privileges when called, so its
-- internal query against `admins` does not re-trigger RLS -- breaking the
-- cycle. This is the standard pattern Supabase's own docs recommend for
-- avoiding recursive RLS. See:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
-- =========================================================

create or replace function is_active_admin(uid uuid, require_full_admin boolean default false)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admins a
    where a.id = uid
      and a.is_active
      and (not require_full_admin or a.role = 'admin')
  );
$$;

-- Re-point every policy that previously inlined the recursive subquery.

drop policy "admins full access categories" on categories;
create policy "admins full access categories" on categories
  for all using (is_active_admin(auth.uid()));

drop policy "admins full access products" on products;
create policy "admins full access products" on products
  for all using (is_active_admin(auth.uid()));

drop policy "admins full access option groups" on product_option_groups;
create policy "admins full access option groups" on product_option_groups
  for all using (is_active_admin(auth.uid()));

drop policy "admins full access options" on product_options;
create policy "admins full access options" on product_options
  for all using (is_active_admin(auth.uid()));

drop policy "admins full access recommendations" on product_recommendations;
create policy "admins full access recommendations" on product_recommendations
  for all using (is_active_admin(auth.uid()));

drop policy "admins manage settings" on business_settings;
create policy "admins manage settings" on business_settings
  for all using (is_active_admin(auth.uid(), true));

drop policy "staff read orders" on orders;
create policy "staff read orders" on orders
  for select using (is_active_admin(auth.uid()));

drop policy "staff update orders" on orders;
create policy "staff update orders" on orders
  for update using (is_active_admin(auth.uid()));

drop policy "staff read order items" on order_items;
create policy "staff read order items" on order_items
  for select using (is_active_admin(auth.uid()));

drop policy "staff read order item options" on order_item_options;
create policy "staff read order item options" on order_item_options
  for select using (is_active_admin(auth.uid()));

drop policy "staff read payments" on payments;
create policy "staff read payments" on payments
  for select using (is_active_admin(auth.uid()));

drop policy "staff read customers" on customers;
create policy "staff read customers" on customers
  for select using (is_active_admin(auth.uid()));

drop policy "staff read status history" on order_status_history;
create policy "staff read status history" on order_status_history
  for select using (is_active_admin(auth.uid()));

drop policy "staff read sales daily" on sales_daily;
create policy "staff read sales daily" on sales_daily
  for select using (is_active_admin(auth.uid()));

-- This was the actual source of the cycle: admins' own policy querying
-- admins. Now it goes through the SECURITY DEFINER function instead.
drop policy "admins manage admins" on admins;
create policy "admins manage admins" on admins
  for all using (is_active_admin(auth.uid(), true));

-- Same fix for promotions (added in migration 0002).
drop policy "admins manage promotions" on promotions;
create policy "admins manage promotions" on promotions
  for all using (is_active_admin(auth.uid(), true));
