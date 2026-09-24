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

## Fixed: admin edits silently failing and reverting on refresh
Every admin save action (`patchProduct`, category rename/toggle, settings save) previously
ignored the HTTP response status — if a `PATCH` request failed for any reason (session hiccup,
network blip, a 403 from a role check), the UI still optimistically updated local state as if it
had succeeded, showing the change immediately. Since nothing was actually written to the
database, the next full page load (which re-fetches from the server) would show the old value
again, which looked like the edit had "reverted." All admin save paths now check `response.ok`
before updating local state, and show an inline error message instead of a false "Saved ✓" when
a save genuinely fails.

## Fixed: admin session silently breaking after token refresh
`requireAdmin()` and the order-status API route were using `createServerReadClient()` -- a
client with no-op cookie `set`/`remove`, which is correct for Server Components (which cannot
write cookies) but wrong for Route Handlers (which can and, for auth, must). Supabase rotates
refresh tokens on use: when an access token expired and `auth.getUser()` transparently refreshed
it, the no-op client couldn't persist the new session back to the browser, so the next admin
action would present an already-invalidated refresh token and fail authentication outright --
surfacing as saves that appeared to work (optimistic UI) but silently didn't, or later requests
failing for no visible reason. Added `createRouteHandlerClient()` (real cookie persistence) in
`lib/supabase/server.ts`, used only by Route Handlers; Server Components continue using the
read-only client, since they have no alternative.

## Admin save errors now show the real reason
Every admin save action (product edits, category rename/toggle, settings, option price/
availability) now surfaces the actual HTTP status and server error message on failure --
distinguishing "you were signed out," a validation error, and a network failure that never
reached the server -- instead of one generic "try again" message. This mirrors the dev-only
diagnostic banner added earlier for the customer menu: specific error text means the next issue
is self-diagnosing instead of requiring another guess-and-check round trip.

## Fixed: admin saves failing with an unhelpful "Save failed (HTTP 500)"
Every admin API route called `createAdminClient()` (and other Supabase calls) without a
try/catch around the route body. If that threw for any reason -- most likely a missing or
incorrect `SUPABASE_SERVICE_ROLE_KEY` -- Next.js's own default error handling produced a bare
500 response with no JSON body, which is why the client-side error message had nothing to show
beyond the status code. Every route now wraps its body in try/catch via a shared
`handleApiError()` helper (`lib/api-error.ts`) that always logs full error detail server-side
(visible in `npm run dev`'s terminal, or Vercel's function logs in production) and returns that
detail to the client for admin-only routes (safe, since these aren't customer-facing) or a
generic customer-safe message for the public order/tracking routes, per the "never show raw
database errors to customers" rule.

**A subtlety worth knowing if this file is touched again:** Next.js uses thrown errors as an
internal signal for its own features -- `cookies()`/`headers()` called during build-time static
analysis throws a `DYNAMIC_SERVER_USAGE` error to mark a route dynamic, and `redirect()`/
`notFound()` work the same way via `NEXT_*`-prefixed digests. A try/catch wrapping an entire
route body will intercept these too unless it explicitly re-throws them --
`handleApiError()`/`isNextControlFlowError()` do this, and it was verified directly: an earlier
version without this check printed a misleading "Dynamic server usage" stack trace during
`next build` (the build still succeeded and routes were still correctly marked dynamic, since
Next has a fallback detection path, but the noisy output looked like a real bug). After the fix,
`next build` runs with zero unexpected output.

## Fixed: inconsistent menu card sizes
`ProductCard.tsx` had no fixed height for the product name, so a one-line name ("Fries") and a
two-line name ("Salted Caramel Coffee" wrapping) produced visibly different card heights within
the same grid row. Fixed with `line-clamp-2` + a fixed `min-h-[2.5rem]` on the name (sized to fit
two lines at the larger of the two font sizes used, so it comfortably covers both), the price/tag
row pinned to the bottom via `mt-auto`, and the card + its `Link` wrapper both set to `h-full`
so they fill their grid cell instead of only the anchor tag's natural (content-sized) height.
Names longer than 18 characters also render in a smaller font size automatically, so long product
names don't dominate the fixed space.

## Pseudo-3D product hero (reverted)
An earlier version replaced the static hero photo with a spinning `rotateY` animation of the
same 2D image plus animated "condensation droplet" particles. This was removed at the person's
request: rotating a flat photo on its Y axis inevitably flattens to an edge-on sliver partway
through each turn (there's no real depth to reveal, since it's a photo, not a 3D model), which
read as visually unpleasant rather than premium. The product page is back to the plain static
hero photo. `components/customer/ProductHeroViewer.tsx` and its supporting CSS keyframes
(`cup-rotate`, `cup-shadow-pulse`, `droplet-fly`) have been deleted rather than left dead in the
codebase. A genuine 3D effect would need actual 3D assets (e.g. `.glb` models) per product, which
don't exist for this menu.

## Scheduled pickup time + admin alerts
Checkout's "Schedule" pickup option now actually collects a time (previously the toggle existed
but no time was ever captured — `scheduled_pickup_at` was accepted by the order API but nothing
in the UI ever sent it). The time input enforces a 20-minute minimum lead time client-side, and
the server independently re-validates the chosen time hasn't already passed — the client-side
`min` attribute on `<input type="time">` is only a UX hint, not a security boundary.

Admins get two layers of visibility into scheduled orders: a persistent tag ("Scheduled 3:00 PM")
on the order card in both the Live Orders board and the Kitchen board, and — Live Orders only —
an active toast notification plus a short two-tone chime (generated via the Web Audio API,
`lib/notify-sound.ts` — no audio file to host) the moment a scheduled order's realtime INSERT
event arrives. Kitchen intentionally gets the visual tag but not the sound, keeping to the
existing principle of that screen staying minimal and not overloading staff with audio alerts
mid-service.

## Animated order tracking progress
The customer tracking page's step indicator now distinguishes three states per step: fully done
(solid, checkmark, no animation — settled), currently active (checkmark plus a pulsing ring via
`step-pulse`, "In progress…" label), and pending (plain gray number). The connecting line
segment leading out of the *current* step (not the ones before or after it) gets an animated
shimmer (`progress-line-active`, a moving gradient) to visually read as "moving toward the next
step," while fully-completed segments stay solid and future segments stay plain gray. The pulse
and shimmer both turn off once an order reaches its final "Completed" step, since a finished
order should read as settled rather than perpetually active. All color transitions use
`transition-colors duration-700` so realtime status updates animate smoothly rather than
snapping instantly.

## GCash QR payment confirmation
Rather than integrating a payment gateway (still not connected — see Scope notes), GCash orders
use a manual confirm flow: `business_settings.gcash_qr_url` (migration `0008_gcash_qr.sql`, admin
uploads it via `/admin/settings` through the same Storage-backed `ImageUpload` component used for
product photos, generalized to take a `folder` prop instead of being product-specific) is shown
to the customer at checkout. They scan it, pay in their own GCash app, and place the order as
normal — the order is created immediately with `payment_status = 'pending'` like any other order.

The order isn't gated by a special status value; instead, `OrdersBoard.tsx` checks
`payment_method === 'gcash' && payment_status !== 'paid'` and swaps the normal "Accept Order"
action for a "Confirm Payment Received" action until an admin manually confirms it via
`PATCH /api/orders/[id]/payment-status` (which updates both `orders.payment_status` and the
matching `payments` row). The customer's confirmation and tracking pages both check the same
condition to show a "confirming your payment" state instead of the normal order-progress steps.
No new order status was added to the enum — reusing the existing `payment_status` column as the
gate keeps this simple and doesn't require touching the order-status step logic at all.

## Fixed: settings save failing with "Invalid settings data" (400)
The settings save form always sends its *entire* state back on every save, including fields the
person didn't touch. `logo_url` in the seed data is a root-relative path (`/images/brand/logo.jpg`),
but the settings API's Zod schema required `z.string().url()` — which only accepts a
fully-qualified URL with a scheme (`https://...`). This meant *every* settings save failed
validation because of the untouched `logo_url` field, regardless of what was actually being
changed — including the new GCash QR upload and toggles like "Scheduled Orders," which looked
like they weren't taking effect because they genuinely weren't reaching the database. Fixed with
a shared `imageRefSchema` (in `settings/route.ts` and both `products` routes, which had the exact
same issue for `image_url`) that accepts either a full URL or a root-relative path. Verified
directly: the exact real-world payload that produced this error now passes the fixed schema and
fails the old one, confirming the diagnosis rather than assuming it.

## Scheduled pickup time window (10:00 AM–8:00 PM, 15-minute slots)
The free-form time input was replaced with a dropdown of fixed slots — every 15 minutes between
10:00 AM and 8:00 PM, starting from whichever is later of "store opens" or "now plus a 20-minute
minimum lead time." If today's window has already fully elapsed, it automatically offers
tomorrow's full window instead of leaving the customer with no options. The server independently
re-validates the chosen time falls in that same window and lands on a 15-minute mark — critical
detail: since the deployed server (e.g. Vercel) typically runs in UTC while the shop operates in
Philippines time (UTC+8, no DST), the server converts the submitted UTC timestamp to Manila wall
-clock time before checking the window, rather than trusting `Date.getHours()` in whatever
timezone the server process happens to be running in. This was tested directly against several
boundary cases (exact window edges, day rollover, non-15-minute marks) rather than assumed correct.

## Timezone audit: everything pinned to real Philippine Standard Time
A broader problem was found and fixed: several date/time calculations relied on
`Date.prototype.setHours()`/`.getHours()`/`.toLocaleTimeString()` without a timezone, which all
silently use whatever timezone the *running process* happens to be in — the server's on Vercel
(UTC by default), or a visitor's device in the browser (which could be anything). For a
single-location Philippines shop, that's wrong: "today's sales" on the admin dashboard, the Sales/
Analytics date filters, the scheduled-pickup time slots, and every place a scheduled time was
displayed were all vulnerable to an 8-hour skew once actually deployed to a server running in UTC
— which most hosting defaults to.

Fixed with one shared, tested utility (`lib/manila-time.ts`) built on `Intl.DateTimeFormat` with
an explicit `timeZone: "Asia/Manila"`, which is the one primitive that reliably ignores the
runtime's own timezone setting. Since the Philippines does not observe daylight saving time, the
UTC+8 offset is a safe constant rather than needing a timezone database lookup. This was verified
directly, not assumed: the same test suite (day-crossing instants, exact window boundaries,
round-trips) was run three times — once under the default sandbox timezone, once with `TZ=UTC`
forced, once with `TZ=America/New_York` forced — and produced identical, correct results all
three times. The full app was then typechecked and built successfully under `TZ=UTC` too,
matching Vercel's actual default runtime rather than just the local dev environment.

Every one of these now goes through the shared utility instead of ad hoc local-timezone
calculations: `startOfManilaDayUTC()` for the admin dashboard and Live Orders "today" boundary,
`resolveDateRange()` (Sales/Analytics filters — today/this week/this month/etc.), the checkout
page's pickup time-slot generator, every "Scheduled 3:00 PM" display across admin/kitchen/
tracking/confirmation, the Analytics daily-sales chart's day grouping, the month/year label, and
the customer list's "last order" date.

## Currency symbol removed
All ₱ (peso) signs have been removed from customer- and admin-facing UI (prices now display as
plain numbers) per a request to run this locally without a specific currency tied to the
interface. `lib/pricing.ts`'s error messages and every component that formatted a price were
updated; the underlying `numeric(10,2)` columns and calculations are unaffected -- only display
formatting changed.

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

Single-select option groups (Size, Sugar Level, Ice) render as native `<select>` dropdowns on
the product customization page rather than pill buttons — multi-select groups (Add-ons) keep the
toggleable-pill UI, since a dropdown can't represent "choose any number of these." Default
selections are only ever seeded from options that are currently `is_active`, so an admin marking
the default size unavailable doesn't leave an invisible/stale selection behind.

## Hover-zoom (desktop enhancement)
The welcome screen's logo and the Pickup/Delivery cards scale up slightly on hover
(`hover:scale-110` / `hover:scale-[1.03]` with a `transition-transform`). This is a progressive
enhancement only — it does nothing on touch devices (no hover state), so mobile behavior is
unchanged.

## Welcome page layout
The outer container switched from `justify-between` (which pinned the header to the top and the
Pickup/Delivery cards to the bottom, leaving a large empty gap on tall viewports) to
`justify-center`, so the whole block — logo, tagline, buttons — is vertically centered as one
unit instead. The logo grew from 96px to 160px ("make the logo bigger"), and the tagline reads
"Sip, smile, repeat."

## Migrations are fully idempotent
Every file in `supabase/migrations/` (0001–0007) and `supabase/seed/seed.sql` can be re-run any
number of times, in any state, without erroring or duplicating data — every `CREATE
TABLE`/`TYPE`/`INDEX` uses `IF NOT EXISTS`, every `CREATE POLICY`/`TRIGGER` is preceded by a
matching `DROP ... IF EXISTS`, every `ALTER TABLE ADD COLUMN`/`ADD CONSTRAINT` is guarded, and
every seed `INSERT` uses `ON CONFLICT ... DO UPDATE`. This was verified directly (not just
written and assumed): the full 7-migration + seed sequence was run twice in a row against a real
Postgres database, confirming zero errors and identical resulting data both times, plus a
targeted test simulating a database that already had the old pre-rename option data, confirming
the migration path cleans it up correctly rather than duplicating it.

Practical upshot: nobody working on this project ever needs to track "which migrations have I
already run" — it's always safe to re-paste the entire sequence from scratch.

## Scope notes (things intentionally simplified for MVP, documented rather than hidden)
- **Drag-and-drop menu sorting** (section 25 says "if practical") ships as manual `sort_order`
  numbers instead of a full drag interface. `@dnd-kit` is already in `package.json` for a future
  pass — the data model doesn't need to change.
- **No self-serve "create first admin" UI**, by design — see README §6. An ordering system
  shouldn't let anyone self-promote to admin from the app itself.
- **Product option prices and availability are now editable from the admin UI**
  (`components/admin/ProductOptionsEditor.tsx`, `/api/admin/options`, `/api/admin/options/[id]`)
  — expand any product in `/admin/menu` to toggle each size/sugar/ice/add-on option
  Available/Unavailable, edit its upcharge, or add a brand-new option to an existing group (e.g.
  a new "Extra Large (32oz)" size tier) via "+ Add option". Creating an entirely new option
  *group* — a new customization category a product doesn't have yet, like adding "Milk Type" to
  a drink that's never had one — is still SQL-only.
- **Image uploads** now go through an in-app "Upload from computer" button
  (`components/admin/ImageUpload.tsx`) that uploads directly to the Supabase Storage
  `product-images` bucket and fills in the resulting public URL — see migration
  `0007_storage_policies.sql` for the required bucket permissions. The plain URL field is still
  there too, for linking to externally-hosted images if preferred.
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
