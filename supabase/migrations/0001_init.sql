-- =========================================================
-- Coffee & Drinks Ordering System — Core Schema
-- Target: Supabase Postgres
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------
create type user_role as enum ('admin', 'staff');
create type fulfillment_type as enum ('pickup', 'delivery');
create type order_status as enum (
  'new', 'accepted', 'preparing', 'ready',
  'out_for_delivery', 'completed', 'cancelled'
);
create type payment_method as enum ('cash', 'gcash', 'card');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- ---------------------------------------------------------
-- ADMIN / STAFF USERS
-- Wraps Supabase auth.users with app-level role info.
-- ---------------------------------------------------------
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- BUSINESS SETTINGS (single-row config table)
-- Everything business-specific lives here — nothing hard-coded.
-- ---------------------------------------------------------
create table business_settings (
  id boolean primary key default true constraint single_row check (id),
  business_name text not null default 'My Coffee Shop',
  logo_url text,
  primary_color text not null default '#0B6B3A',
  contact_number text,
  business_address text,
  business_hours jsonb not null default '{}'::jsonb, -- {"mon": {"open":"07:00","close":"20:00"}, ...}

  accepting_orders boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  scheduled_orders_enabled boolean not null default true,

  cash_enabled boolean not null default true,
  gcash_enabled boolean not null default true,
  card_enabled boolean not null default false,

  free_delivery_minimum numeric(10,2) not null default 300.00,
  delivery_fee numeric(10,2) not null default 49.00,
  minimum_delivery_order numeric(10,2) not null default 100.00,
  estimated_pickup_minutes int not null default 15,
  estimated_delivery_minutes int not null default 40,

  updated_at timestamptz not null default now()
);

insert into business_settings (id) values (true);

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  sku text unique,
  name text not null,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  image_url text,
  is_active boolean not null default true,
  is_bestseller boolean not null default false,
  is_featured boolean not null default false,
  is_sample_data boolean not null default false, -- marks seeded demo products
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category_id on products(category_id);
create index idx_products_active on products(is_active);

-- Product -> recommended products (upsell), MVP simple join table
create table product_recommendations (
  product_id uuid not null references products(id) on delete cascade,
  recommended_product_id uuid not null references products(id) on delete cascade,
  sort_order int not null default 0,
  primary key (product_id, recommended_product_id),
  check (product_id <> recommended_product_id)
);

-- ---------------------------------------------------------
-- PRODUCT CUSTOMIZATION: option groups + options
-- e.g. Group "Size" -> Options "12oz" (+0), "16oz" (+20)
-- Group "Sugar Level" -> Options 0/25/50/75/100%
-- ---------------------------------------------------------
create table product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,               -- "Size", "Sugar Level", "Ice"
  is_required boolean not null default false,
  allow_multiple boolean not null default false, -- true = checkbox group, false = single-select
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_option_groups_product on product_option_groups(product_id);

create table product_options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,               -- "16oz", "50%", "No Ice"
  price_delta numeric(10,2) not null default 0, -- can be 0 or positive
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index idx_options_group on product_options(option_group_id);

-- Standalone add-ons (e.g. Extra Shot +30, Coffee Jelly +20)
-- Modeled as its own option group type for flexibility; reuses same tables
-- via a group with allow_multiple = true, name = 'Add-ons'.
-- (No separate table needed — kept DRY. See seed data for example.)

-- ---------------------------------------------------------
-- CUSTOMERS (recognized by mobile number, no account required)
-- ---------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null unique,
  order_count int not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_mobile on customers(mobile_number);

-- ---------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,                       -- human-friendly #1048 (internal serial, formatted in app)
  tracking_token uuid not null default gen_random_uuid(), -- secure token for public tracking URL

  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_mobile text not null,

  fulfillment_type fulfillment_type not null,

  -- pickup fields
  pickup_time_type text check (pickup_time_type in ('asap','scheduled')),
  scheduled_pickup_at timestamptz,

  -- delivery fields
  delivery_address text,
  delivery_landmark text,
  delivery_instructions text,

  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,

  status order_status not null default 'new',

  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_orders_tracking_token on orders(tracking_token);
create index idx_orders_created_at on orders(created_at);
create index idx_orders_status on orders(status);
create index idx_orders_customer_id on orders(customer_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_snapshot text not null,   -- preserved even if product later renamed/deleted
  unit_price numeric(10,2) not null,     -- server-calculated, includes option deltas
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on order_items(order_id);

create table order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_group_name_snapshot text not null,
  option_name_snapshot text not null,
  price_delta numeric(10,2) not null default 0
);

create index idx_order_item_options_item on order_item_options(order_item_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by uuid references admins(id),
  changed_at timestamptz not null default now()
);

create index idx_order_status_history_order on order_status_history(order_id);

-- ---------------------------------------------------------
-- PAYMENTS (abstraction layer — provider-agnostic)
-- ---------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  status payment_status not null default 'pending',
  amount numeric(10,2) not null,
  provider text,                 -- 'paymongo' | 'xendit' | null for cash
  provider_reference text,       -- external charge/intent id, never raw card data
  raw_response jsonb,            -- provider webhook payload for audit (no PAN/CVV ever)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_order_id on payments(order_id);
create index idx_payments_status on payments(status);

-- ---------------------------------------------------------
-- DAILY SALES ROLLUP (for fast dashboard reads)
-- Populated by trigger/cron on order completion.
-- ---------------------------------------------------------
create table sales_daily (
  sales_date date primary key,
  gross_sales numeric(12,2) not null default 0,
  order_count int not null default 0,
  items_sold int not null default 0,
  pickup_revenue numeric(12,2) not null default 0,
  delivery_revenue numeric(12,2) not null default 0,
  cash_revenue numeric(12,2) not null default 0,
  gcash_revenue numeric(12,2) not null default 0,
  card_revenue numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- updated_at auto-touch trigger (generic)
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();
create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();
create trigger trg_admins_updated before update on admins
  for each row execute function set_updated_at();
create trigger trg_business_settings_updated before update on business_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Row Level Security
-- Public (anon) role: can read active menu, create orders,
-- read only their own order via tracking_token. No direct writes to
-- financial/aggregate tables. Admin/staff role does everything via
-- service role or authenticated admin policies.
-- ---------------------------------------------------------
alter table categories enable row level security;
alter table products enable row level security;
alter table product_option_groups enable row level security;
alter table product_options enable row level security;
alter table product_recommendations enable row level security;
alter table business_settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_options enable row level security;
alter table payments enable row level security;
alter table customers enable row level security;
alter table admins enable row level security;
alter table order_status_history enable row level security;
alter table sales_daily enable row level security;

-- Public read access to active menu content
create policy "public read active categories" on categories
  for select using (is_active = true);
create policy "public read active products" on products
  for select using (is_active = true);
create policy "public read option groups" on product_option_groups
  for select using (true);
create policy "public read options" on product_options
  for select using (is_active = true);
create policy "public read recommendations" on product_recommendations
  for select using (true);
create policy "public read business settings" on business_settings
  for select using (true);

-- Orders: customers create via API route using service role (server calculates
-- totals), so no public insert policy is needed on the client. Public can read
-- only their own order by tracking_token, via a dedicated API route (also
-- server-side) rather than direct table access — tokens are never used as an
-- RLS predicate against auth.uid() since customers are unauthenticated.

-- Admins: full access when authenticated and present in admins table.
create policy "admins full access categories" on categories
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins full access products" on products
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins full access option groups" on product_option_groups
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins full access options" on product_options
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins full access recommendations" on product_recommendations
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins manage settings" on business_settings
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.role = 'admin'));
create policy "staff read orders" on orders
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff update orders" on orders
  for update using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read order items" on order_items
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read order item options" on order_item_options
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read payments" on payments
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read customers" on customers
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read status history" on order_status_history
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "staff read sales daily" on sales_daily
  for select using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));
create policy "admins manage admins" on admins
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.role = 'admin'));

-- NOTE: All customer-facing writes (creating orders, order items, payments,
-- upserting customers) go through Next.js server-side API routes using the
-- Supabase service-role key, which bypasses RLS safely because the server
-- (not the browser) computes prices and validates input. This is what
-- section 32 (Security) requires: never trust client-submitted prices.
