-- =========================================================
-- O, HOW? COFFEE & DRINKS — MENU SEED DATA
-- Sourced from the brand's own poster set. Still editable from the admin
-- dashboard at any time — nothing here is locked in code.
--
-- SAFE TO RE-RUN: every insert below uses ON CONFLICT ... DO UPDATE, so
-- pasting this file into the Supabase SQL editor again after the menu
-- changes (as it did across our conversation) updates existing rows
-- instead of erroring out on duplicate keys or silently doing nothing.
-- Run the migrations in supabase/migrations/ (0001 through 0005, in order)
-- before running this file.
-- =========================================================

-- ---------------------------------------------------------
-- BUSINESS IDENTITY
-- ---------------------------------------------------------
update business_settings set
  business_name = 'O, How? Coffee & Drinks',
  logo_url = '/images/brand/logo.jpg',
  primary_color = '#5B6E42'
where id = true;

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
insert into categories (id, name, description, sort_order, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'Coffee', 'Espresso-based drinks, hot or iced.', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Non-Coffee', 'Milk drinks, sodas, and fruit blends.', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Food', 'Snacks to go with your drink.', 3, false)
  -- Food starts DISABLED: there's no real food photography/menu yet, so it's
  -- hidden from customers rather than shown with sample data. Flip
  -- is_active to true from /admin/categories whenever real items are ready —
  -- no code change needed.
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------
-- PRODUCTS — COFFEE
-- ---------------------------------------------------------
insert into products (id, category_id, sku, name, description, base_price, image_url, is_active, is_bestseller, is_featured, is_sample_data, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'CF-001', 'Spanish Latte', 'Bold and sweet with a touch of spice.', 120.00, null, true, false, false, false, 1),
  ('a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'CF-002', 'Sea Salt Latte', 'Bold coffee meets creamy milk with a hint of sea salt.', 130.00, '/images/products/sea-salt-latte.jpg', true, true, true, false, 2),
  ('a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'CF-003', 'White Mocha Latte', 'Creamy white chocolate meets rich espresso.', 130.00, null, true, false, false, false, 3),
  ('a1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'CF-004', 'Salted Caramel Coffee', 'Sweet meets salty in perfect harmony.', 130.00, null, true, false, false, false, 4),
  ('a1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'CF-005', 'Caffe Latte', 'Simple, classic, and steady.', 110.00, null, true, false, false, false, 5),
  ('a1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'CF-006', 'Hazelnut Coffee', 'Nutty and smooth in every sip.', 130.00, null, true, true, true, false, 6)
on conflict (id) do update set
  category_id = excluded.category_id, sku = excluded.sku, name = excluded.name,
  description = excluded.description, base_price = excluded.base_price,
  image_url = excluded.image_url, is_active = excluded.is_active,
  is_bestseller = excluded.is_bestseller, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------
-- PRODUCTS — NON-COFFEE
-- ---------------------------------------------------------
insert into products (id, category_id, sku, name, description, base_price, image_url, is_active, is_bestseller, is_featured, is_must_try, is_sample_data, sort_order) values
  ('a2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'NC-001', 'Chocolate Milk', 'Rich, creamy, indulgent — premium cocoa and fresh milk.', 140.00, '/images/products/chocolate-milk.jpg', true, false, false, false, false, 1),
  ('a2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'NC-002', 'Strawberry Matcha Milk', 'Sweet strawberries layered with premium matcha.', 150.00, '/images/products/strawberry-matcha-milk.jpg', true, true, true, false, false, 2),
  ('a2000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'NC-003', 'Blueberry Milk', 'Smooth and creamy with real blueberry flavor.', 140.00, '/images/products/blueberry-milk.jpg', true, false, false, true, false, 3),
  ('a2000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'NC-004', 'Lemon Soda', 'Crisp and refreshing, like a new start.', 100.00, null, true, false, false, false, false, 4),
  ('a2000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'NC-005', 'Passion Fruit Soda', 'Bright, bubbly, and full of joy.', 110.00, null, true, true, true, false, false, 5),
  ('a2000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'NC-006', 'Milk Passion Fruit Drink', 'Creamy and fruity, a comforting favorite.', 130.00, null, true, false, false, false, false, 6)
on conflict (id) do update set
  category_id = excluded.category_id, sku = excluded.sku, name = excluded.name,
  description = excluded.description, base_price = excluded.base_price,
  image_url = excluded.image_url, is_active = excluded.is_active,
  is_bestseller = excluded.is_bestseller, is_featured = excluded.is_featured,
  is_must_try = excluded.is_must_try, sort_order = excluded.sort_order;

-- ---------------------------------------------------------
-- PRODUCTS — FOOD (no branded photography yet — placeholders, clearly sample)
-- ---------------------------------------------------------
insert into products (id, category_id, sku, name, description, base_price, image_url, is_active, is_bestseller, is_featured, is_sample_data, sort_order) values
  ('a3000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'FD-001', 'Chicken Sandwich', 'Grilled chicken, lettuce, and mayo on toasted bread.', 160.00, null, true, false, false, true, 1),
  ('a3000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'FD-002', 'Fries', 'Crispy golden fries.', 90.00, null, true, false, false, true, 2),
  ('a3000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'FD-003', 'Cookies', 'Freshly baked chocolate chip cookies.', 60.00, null, true, false, false, true, 3)
on conflict (id) do update set
  category_id = excluded.category_id, sku = excluded.sku, name = excluded.name,
  description = excluded.description, base_price = excluded.base_price,
  image_url = excluded.image_url, is_active = excluded.is_active,
  is_bestseller = excluded.is_bestseller, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------
-- OPTION GROUPS
-- ---------------------------------------------------------
insert into product_option_groups (id, product_id, name, is_required, allow_multiple, sort_order) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Size', true, false, 1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Sugar Level', true, false, 2),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Ice', true, false, 3),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Add-ons', false, true, 4),

  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Size', true, false, 1),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Ice', true, false, 2),

  ('b3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Size', true, false, 1),
  ('b3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Sugar Level', true, false, 2),
  ('b3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Ice', true, false, 3)
on conflict (id) do update set
  product_id = excluded.product_id, name = excluded.name,
  is_required = excluded.is_required, allow_multiple = excluded.allow_multiple,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------
-- OPTIONS
-- Conflict target is (option_group_id, name) — see migration 0005 — since
-- these rows don't have caller-supplied IDs.
-- ---------------------------------------------------------
insert into product_options (option_group_id, name, price_delta, is_default, sort_order) values
  ('b1000000-0000-0000-0000-000000000001', '12oz', 0,  true,  1),
  ('b1000000-0000-0000-0000-000000000001', '16oz', 20, false, 2),
  ('b1000000-0000-0000-0000-000000000002', '0%',   0, false, 1),
  ('b1000000-0000-0000-0000-000000000002', '25%',  0, false, 2),
  ('b1000000-0000-0000-0000-000000000002', '50%',  0, true,  3),
  ('b1000000-0000-0000-0000-000000000002', '75%',  0, false, 4),
  ('b1000000-0000-0000-0000-000000000002', '100%', 0, false, 5),
  ('b1000000-0000-0000-0000-000000000003', 'No Ice',      0, false, 1),
  ('b1000000-0000-0000-0000-000000000003', 'Less Ice',    0, false, 2),
  ('b1000000-0000-0000-0000-000000000003', 'Regular Ice', 0, true,  3),
  ('b1000000-0000-0000-0000-000000000004', 'Extra Shot',    30, false, 1),
  ('b1000000-0000-0000-0000-000000000004', 'Coffee Jelly',  20, false, 2),
  ('b1000000-0000-0000-0000-000000000004', 'Whipped Cream', 20, false, 3),

  ('b2000000-0000-0000-0000-000000000001', '12oz', 0,  true,  1),
  ('b2000000-0000-0000-0000-000000000001', '16oz', 20, false, 2),
  ('b2000000-0000-0000-0000-000000000002', 'Less Ice',    0, false, 1),
  ('b2000000-0000-0000-0000-000000000002', 'Regular Ice', 0, true,  2),

  ('b3000000-0000-0000-0000-000000000001', '12oz', 0,  true,  1),
  ('b3000000-0000-0000-0000-000000000001', '16oz', 20, false, 2),
  ('b3000000-0000-0000-0000-000000000002', '25%',  0, false, 1),
  ('b3000000-0000-0000-0000-000000000002', '50%',  0, true,  2),
  ('b3000000-0000-0000-0000-000000000002', '75%',  0, false, 3),
  ('b3000000-0000-0000-0000-000000000003', 'Less Ice',    0, false, 1),
  ('b3000000-0000-0000-0000-000000000003', 'Regular Ice', 0, true,  2)
on conflict (option_group_id, name) do update set
  price_delta = excluded.price_delta,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------
-- UPSELL RECOMMENDATIONS
-- ---------------------------------------------------------
insert into product_recommendations (product_id, recommended_product_id, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 1),
  ('a1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 2),
  ('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 1),
  ('a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001', 1)
on conflict (product_id, recommended_product_id) do update set
  sort_order = excluded.sort_order;
