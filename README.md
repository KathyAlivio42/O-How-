# O, How? Coffee & Drinks — Online Ordering System

A mobile-first digital ordering system for a coffee & drinks shop: customers scan a QR code,
order for pickup or delivery, and pay by cash (GCash/card wired for a future gateway). The owner
manages everything — menu, prices, bestsellers, delivery settings, live orders, sales — from an
admin dashboard, without touching code.

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Database/Auth/Realtime:** Supabase (Postgres)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Hosting:** Vercel (recommended)

See `docs/ARCHITECTURE.md` for the full folder structure and design decisions.

## 1. Prerequisites

- Node.js 18.18+ (Node 20 recommended)
- A free [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (for deployment — optional for local dev)

## 2. Install

```bash
npm install
```

## 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. In the Supabase dashboard, go to **SQL Editor** and run the migration files in this exact
   order (copy-paste each file's contents and click "Run"):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_promotions.sql`
   - `supabase/migrations/0003_sales_rollup.sql`
   - `supabase/migrations/0004_must_try_tag.sql`
   - `supabase/migrations/0005_seed_idempotency.sql`
   - `supabase/migrations/0006_fix_admin_rls_recursion.sql`
3. Then run `supabase/seed/seed.sql` the same way to load the starter menu (O, How?'s real
   drinks — you can edit all of this later from the admin dashboard).
4. Go to **Database → Replication** and enable Realtime for the `orders` table. This is what
   makes the Live Orders board, kitchen screen, and customer tracking page update instantly
   without a page refresh.
5. Go to **Storage** and create a public bucket named `product-images` if you want to upload
   photos from the admin dashboard rather than linking to externally-hosted images (see the
   Admin Guide).

## 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project's **Settings → API** page:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # keep this secret — never commit it
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is only ever used in server-side code (API routes) — never sent to
the browser. It's what lets the server calculate final prices and write orders even though the
public can't write to those tables directly (see `docs/ARCHITECTURE.md` for why).

Leave the `PAYMENT_PROVIDER_*` variables blank until you're ready to connect GCash/Card (see
§8 below). Cash works with no configuration.

## 5. Run Locally

```bash
npm run dev
```

Visit:
- `http://localhost:3000` — customer ordering flow (this is what your QR code should point to)
- `http://localhost:3000/admin/login` — admin dashboard
- `http://localhost:3000/kitchen` — kitchen/barista screen

## 6. Create Your First Admin Account

There's no public sign-up screen for admins by design. To create the first one:

1. In the Supabase dashboard, go to **Authentication → Users → Add User**. Set an email and
   password.
2. Copy the new user's ID (UUID).
3. In the **SQL Editor**, run:

```sql
insert into admins (id, full_name, role, is_active)
values ('paste-the-user-id-here', 'Your Name', 'admin', true);
```

4. Sign in at `/admin/login` with that email/password.

To add staff (who can view orders and use the kitchen screen but not change the menu or
settings), repeat with `role = 'staff'`.

## 7. Changing the Menu (No Code)

Everything below is done from `/admin/menu`, `/admin/categories`, and `/admin/settings` — see
`docs/ADMIN_GUIDE.md` for click-by-click steps.

- **Add/edit/disable products, change prices, mark bestsellers** → `/admin/menu`
- **Add/rename/disable categories** → `/admin/categories`
- **Delivery minimum, delivery fee, business hours, payment toggles** → `/admin/settings`

Product **customization options** (sizes, sugar levels, add-ons) currently need to be set up via
SQL in `product_option_groups`/`product_options` (see the seed file for the exact pattern) — a
UI for this is a natural next addition once the core flow is validated with real customers.

## 8. Connecting a Real Payment Gateway

Cash works immediately. GCash and Card are structured but not wired to a live gateway yet
(`src/lib/payments/` is where a PayMongo or Xendit integration would plug in — the `payments`
table already tracks `provider`, `provider_reference`, and `status` for this). No raw card data
is ever stored, per the brief's security requirement.

## 9. Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the repo.
3. Add the same environment variables from `.env.local` in Vercel's Project Settings →
   Environment Variables.
4. Deploy. Point your QR code at `https://your-domain.vercel.app/`.

## Troubleshooting: "No items in this category yet" / no category tabs on `/menu`

This means the customer app loaded but got zero rows back from `categories`/`products` — it's a
data/setup issue, not a code bug. Almost always one of:

1. **`seed.sql` was never run**, or was run *before* all the migration files — the two must be
   run in order: `0001_init.sql` → `0002_promotions.sql` → `0003_sales_rollup.sql` →
   `0004_must_try_tag.sql` → `0005_seed_idempotency.sql` → `0006_fix_admin_rls_recursion.sql` →
   then `seed/seed.sql`. If a migration is skipped, `seed.sql` references columns that don't
   exist yet (e.g. `is_must_try`), the whole script fails, and the Supabase SQL editor rolls back
   everything in that paste — including the category rows that looked like they should have been
   created first.
2. **`.env.local` still has placeholder values**, or was edited after `npm run dev` was already
   running (restart the dev server after changing env vars).
3. Check the Supabase **Table Editor → categories** — if it's genuinely empty, re-run
   `seed/seed.sql`. As of this version, every insert in that file uses `ON CONFLICT ... DO
   UPDATE`, so it's always safe to paste and run again after any menu change — it will never
   error on duplicate keys or silently no-op.
4. **If the error is specifically "infinite recursion detected in policy for relation
   'admins'"** — this was a real bug in migration `0001_init.sql`'s Row Level Security policies
   (an admin-access policy queried the `admins` table to check admin status, which re-triggered
   `admins`' own RLS policies, which queried `admins` again, forever). It's fixed in
   `0006_fix_admin_rls_recursion.sql`. If you already ran `0001`–`0005` before this fix existed,
   just run `0006` now — it drops and recreates the affected policies, no need to redo anything
   else.

If the SQL editor showed a red error message when you ran a migration or the seed file, that
message tells you exactly which of the above happened — it's worth re-reading before re-running
anything.

## Project Status

Phases 1–3 (schema, customer ordering flow, admin dashboard) and the Sales/Analytics/Customers/
Export pieces of Phase 4 are built and have been type-checked and built successfully. Known
scope cuts, documented rather than hidden, are listed in `docs/ARCHITECTURE.md` under
"Scope notes."
