# Architecture — Coffee & Drinks Ordering System

## Stack
- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database/Auth/Storage/Realtime**: Supabase (Postgres)
- **Hosting**: Vercel
- **Payments**: Provider-agnostic abstraction, cash working in MVP, PayMongo/Xendit-ready

## Why this stack
Matches the brief's preferred architecture directly (section 40). Next.js API routes let us
keep pricing logic and payment secrets server-side while shipping one deployable app. Supabase
gives Postgres + RLS + Realtime + Auth + Storage without standing up separate services — a good
fit for a small business that needs low operational overhead.

## Folder structure (target — built out phase by phase)

```
coffee-order-app/
├── supabase/
│   ├── migrations/0001_init.sql      # schema (done — Phase 1)
│   └── seed/seed.sql                 # sample/demo menu (done — Phase 1)
├── src/
│   ├── app/
│   │   ├── (customer)/               # public ordering flow — mobile-first
│   │   │   ├── page.tsx              # QR landing / welcome (Pickup or Delivery)
│   │   │   ├── menu/page.tsx
│   │   │   ├── product/[id]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── confirmation/[orderNumber]/page.tsx
│   │   │   └── track/[token]/page.tsx
│   │   ├── (admin)/admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── menu/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── kitchen/page.tsx          # simplified staff view
│   │   └── api/
│   │       ├── orders/route.ts       # POST: server calculates totals, creates order
│   │       ├── orders/[id]/status/route.ts
│   │       ├── track/[token]/route.ts
│   │       ├── payments/[method]/route.ts
│   │       └── export/route.ts
│   ├── components/
│   │   ├── customer/                 # ProductCard, CartDrawer, DeliveryProgress, etc.
│   │   ├── admin/                    # OrderBoard, SalesChart, ProductForm, etc.
│   │   └── ui/                       # shared primitives (Button, Card, Badge, Modal)
│   ├── lib/
│   │   ├── supabase/{client.ts,server.ts,admin.ts}
│   │   ├── pricing.ts                # server-side authoritative price calculator
│   │   ├── payments/{index.ts,cash.ts,paymongo.ts,xendit.ts}
│   │   └── types.ts                  # generated/shared DB types
│   └── styles/globals.css
├── docs/
│   ├── ARCHITECTURE.md               # this file
│   └── ADMIN_GUIDE.md                # Phase 4
├── .env.example
├── package.json
├── tailwind.config.ts
└── README.md
```

## Key design decisions

**Nothing is hard-coded.** Categories, products, options, bestsellers, delivery minimums, business
hours, and payment toggles all live in `business_settings`, `categories`, `products`, and related
tables (see `supabase/migrations/0001_init.sql`). The seed data in `seed.sql` is explicitly flagged
`is_sample_data = true` and is meant to be replaced from the admin dashboard.

**Server calculates every price.** The client never sends a trusted total. `POST /api/orders`
receives product IDs + selected option IDs + quantities only; `lib/pricing.ts` re-derives
`unit_price`/`line_total`/`subtotal`/`delivery_fee`/`total` from the database on the server, using
the service-role Supabase client. This satisfies section 32's "never trust client prices" rule.

**Order numbers vs. IDs.** `orders.id` is an internal UUID. `orders.order_number` is a Postgres
`serial` used for the human-friendly `#1048` shown to customers/staff. `orders.tracking_token` is a
separate random UUID used in the public tracking URL (`/track/[token]`) so tracking links can't be
guessed by incrementing a number.

**RLS model.** Public (anon) role gets read-only access to active menu content and business
settings. All writes that touch money (orders, order_items, payments) go through Next.js API
routes using the Supabase **service role** key — never exposed to the browser — after server-side
validation. Admin/staff rows are gated by an `admins` table checked against `auth.uid()`.

**Realtime.** The Live Orders board and kitchen view subscribe to Postgres changes on `orders` via
Supabase Realtime, so new orders and status changes appear without a page refresh, without needing
custom websocket infrastructure.

**Inventory-ready, not inventory-built.** No `ingredients` or `product_ingredients` tables yet
(section 28 says this can come later), but `products` and `product_options` are structured so a
future ingredient-deduction table can reference `product_id`/`option_id` cleanly without a schema
rewrite.

## Phase plan
1. ✅ **Phase 1** — Schema, seed data, project scaffold, this document.
2. ✅ **Phase 2** — Customer ordering flow: welcome, menu (+ radial bottom-sheet browser),
   product customization, cart, checkout, order creation API, confirmation, live tracking.
3. ✅ **Phase 3** — Admin dashboard: auth, today's dashboard, Live Orders board (Realtime),
   kitchen view, menu/category management, settings.
4. ✅ **Phase 4** — Customers list, Sales dashboard (date-filterable), Analytics (6 charts +
   bestseller ranking), CSV export (orders/sales/customers), README + Admin Guide.

All four phases have been installed, type-checked (`tsc --noEmit`), and built (`next build`,
all 22 routes generating successfully) inside this sandbox. What hasn't been verified is a live
Supabase connection end-to-end, since this environment can't reach supabase.co — that's the
natural next step once you connect a real project.

## Admin/staff setup (needed once, manually, in Supabase)
There's no self-serve "create the first admin" flow by design — that's a deliberate gap, not an
oversight, since an ordering system shouldn't let anyone self-promote to admin. To create the
first user: add them in Supabase Auth (dashboard or `auth.admin.createUser`), then insert a
matching row in `admins` with their `auth.users.id` and `role = 'admin'`. Full steps will land in
`README.md` / `docs/ADMIN_GUIDE.md` in Phase 4.

## Menu redesign (Grab-style cards + Must Try tag)
The product grid now follows the reference Grab/McDonald's screenshot: a square image with a
small circular quick-add (+) button overlapping its bottom-right corner, name, a single tag pill,
and price — no description on regular cards. Tapping **+** adds the item with its default
options (12oz, 50% sugar, Regular Ice, etc. — whatever the admin marked `is_default`) without
leaving the grid; tapping the card itself still opens full customization. If a required option
group has no default set, quick-add safely falls back to the customization page instead of
guessing.

A second, independent tag — **Must Try** (`products.is_must_try`, migration
`0004_must_try_tag.sql`) — sits alongside Bestseller. Only one pill renders per card
(`ProductTag.tsx` prioritizes Bestseller if a product somehow has both), matching the
single-badge style of the reference screenshot.

Each category shows up to 2 `is_featured` products in a **Best Sellers** spotlight section above
the grid — larger cards with the description visible (the "2 bestsellers with a description"
request), excluded from the grid below to avoid duplication. If an admin/staff member happens to
be signed in while viewing the public menu, a small pencil icon appears on spotlight cards linking
to `/admin/menu` — customers never see it, since it's gated on the same `admins` table check used
everywhere else, not a separate permission system.

The menu is intentionally down to two visible categories, **Coffee** and **Non-Coffee** — `Food`
still exists as a row in `categories` but ships with `is_active = false` in the seed data, since
there's no real food menu yet. Flip it on from `/admin/categories` whenever real items exist; nothing
in the code assumes exactly two categories.

A search icon in the menu header reveals a plain text filter across all products' names/
descriptions (client-side, since the full product list is already loaded) — a lightweight
stand-in for the Grab reference's search icon, without the "For You"/dietary-filter dropdown,
which didn't have an equivalent concept here.

## Hover-zoom (desktop enhancement)
The welcome screen's logo and the Pickup/Delivery cards scale up slightly on hover
(`hover:scale-110` / `hover:scale-[1.03]` with a `transition-transform`). This is a progressive
enhancement only — it does nothing on touch devices (no hover state), so mobile behavior is
unchanged.

## Scope notes (things intentionally simplified for MVP, documented rather than hidden)
- **Drag-and-drop menu sorting** (section 25 says "if practical") ships as manual `sort_order`
  numbers instead of a full drag interface. `@dnd-kit` is already in `package.json` for a future
  pass — the data model doesn't need to change.
- **No self-serve "create first admin" UI**, by design — see README §6. An ordering system
  shouldn't let anyone self-promote to admin from the app itself.
- **Product option groups (size/sugar/add-ons) are seeded via SQL**, not yet editable from the
  admin UI — building that form is a contained follow-up on top of the existing
  `product_option_groups`/`product_options` tables.
- **Image uploads** use a plain URL field in the admin product form rather than a native
  "upload from your phone" flow. Supabase Storage is provisioned for this (README §3 step 5);
  wiring the upload button is a contained follow-up.
- **Analytics "Top Selling Products" custom range** currently falls back to "This Month" if a
  range spans outside the current month, since it reuses the month's already-fetched data rather
  than issuing a second query — flagged in a code comment in `AnalyticsDashboard.tsx`.
- **Promotions** (section 12/52) has its schema (`0002_promotions.sql`) but isn't applied in
  `src/lib/pricing.ts` yet — see that migration's own comment for exactly what wiring it up
  would involve.
- **Payment gateway (GCash/Card)** is structured (`payments` table, method/status enums) but not
  connected to PayMongo/Xendit — cash is fully functional today.

## Branding note (updated)
The original placeholder "Binge Green" palette has been replaced with the real **O, How?
Coffee & Drinks** identity: sage/olive green (`brand`), warm cream (`cream`), and a terracotta/
clay accent (`clay`) reserved for the single deliberate accent moment — the bestseller badge —
so it doesn't compete with the brand green used for primary actions. Real product photography
is used for the drinks that have it (Chocolate Milk, Strawberry Matcha Milk, Blueberry Milk, Sea
Salt Latte); the rest fall back to a simple cup glyph until photos are uploaded from the admin
dashboard.

## Menu browsing: Radial Bottom Sheet
`src/components/customer/RadialBottomSheet.tsx` implements the requested picker: a fixed,
always-readable preview (image + name + description + price) above a horizontally-scrollable,
snap-to-center strip of circular thumbnails. Off-center items shrink, fade, and lift along an arc
as they move away from center, giving a wheel-like feel while staying a plain scrollable list
under the hood — no custom gesture library, so it stays accessible (keyboard/tab still reaches
every item, nothing depends on the arc motion to be usable). It's opened from a "Browse" button on
the menu page; the standard grid stays as the primary, more conventional way to browse.

## Promotions (structural hook, not yet active)
`supabase/migrations/0002_promotions.sql` adds a `promotions` table (percentage or fixed-amount,
scoped to all products / a category / a single product, with optional promo code and date range).
It is **not yet applied** in `src/lib/pricing.ts` — that's flagged in the migration's own comment
as future Phase-3/4 work — but the schema is ready so adding real discounts later won't require
another migration. Bestseller tags (`products.is_bestseller`) and price changes
(`products.base_price`) are already fully data-driven; wiring them into the admin dashboard is
Phase 3.
