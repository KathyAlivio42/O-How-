-- =========================================================
-- Promotions — structural hook for later.
-- Not yet applied in src/lib/pricing.ts. Added now so the schema doesn't
-- need to change when discounts/promo codes are built in a future phase.
-- =========================================================

create type discount_type as enum ('percentage', 'fixed_amount');
create type promo_scope as enum ('all_products', 'category', 'product');

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- shown to staff in admin, e.g. "Rainy Day 20% Off"
  code text unique,                 -- optional customer-facing promo code; null = automatic promo
  description text,
  discount_type discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  scope promo_scope not null default 'all_products',
  category_id uuid references categories(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'category' and category_id is not null and product_id is null) or
    (scope = 'product' and product_id is not null and category_id is null) or
    (scope = 'all_products' and category_id is null and product_id is null)
  )
);

create index idx_promotions_active on promotions(is_active);
create index idx_promotions_code on promotions(code);

alter table promotions enable row level security;

create policy "public read active promotions" on promotions
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "admins manage promotions" on promotions
  for all using (exists (select 1 from admins a where a.id = auth.uid() and a.role = 'admin'));

create trigger trg_promotions_updated before update on promotions
  for each row execute function set_updated_at();

-- To wire this in later: src/lib/pricing.ts should look up active promotions
-- matching each order line's product/category (or an all_products promo),
-- apply the best applicable discount per line, and record the applied
-- promotion id + discount amount on order_items for reporting.
