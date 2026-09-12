# Admin Guide

Everything here happens at `/admin` after you sign in. No code, no SQL, unless noted.

## Signing In

Go to `/admin/login` and sign in with the email/password your developer set up for you (see
README §6 for how that account gets created the first time).

---

## Menu Management (`/admin/menu`)

### Add a new product
1. Scroll to the bottom of the category you want to add to.
2. Tap **+ Add Product**.
3. Enter a name and price, pick a category, tap **Add**.
4. The product appears immediately, active by default. Tap it to add a description or photo.

### Edit a product (name, description, price, photo)
1. Find the product and tap the **▾** arrow on its card to expand it.
2. Change any field — name, description, price, or image URL.
3. Tap **Save Changes**. It updates on the customer menu right away.

### Change a price
Expand the product (as above), update the **Price** field, tap **Save Changes**. That's it — no
approval step, no deploy, no waiting.

### Mark a product as a Bestseller
Tap the **🔥 Bestseller** pill on the product's card. It toggles on/off instantly and the 🔥
badge appears on the customer-facing menu immediately.

### Mark a product as Featured
Same idea — tap the **Featured** pill. (Featured is reserved for future homepage/highlight use;
Bestseller is what shows the 🔥 badge today.)

### Disable a product (take it off the menu temporarily)
Tap the **Active** pill so it reads **Disabled**. The product stays in your records (with all its
past order history) but disappears from the customer-facing menu. Tap it again to bring it back.

### Upload a product photo
For now, paste an image URL into the **Image URL** field when editing a product (e.g. a link to
a photo you've uploaded to Supabase Storage's `product-images` bucket, or any public image URL).
A direct "upload from your phone" button is a natural next addition once Supabase Storage is
connected in your project.

---

## Categories (`/admin/categories`)

- **Rename**: click into the text field, type the new name, click elsewhere to save.
- **Add**: type a name in the box at the bottom, tap **Add**.
- **Disable**: tap the **Active/Disabled** pill — disabled categories (and everything in them)
  disappear from the customer menu.

---

## Processing an Order (`/admin/orders`)

The Live Orders board has four columns: **New → Preparing → Ready → Completed**.

1. A new order appears in **New** the moment a customer checks out — no refresh needed.
2. Tap **Accept Order** to move it to **Preparing**.
3. Tap **Mark Ready** when it's done.
4. Tap **Complete** once the customer has picked it up / it's been delivered.

The customer sees each of these steps update live on their own tracking page.

---

## Using the Kitchen Dashboard (`/kitchen`)

This is a simplified version of Live Orders meant for the espresso bar, not the front counter —
it only shows what's needed to make the drinks:

- Order number, items, and Pickup/Delivery tag.
- **Start Preparing** moves it out of the queue into "in progress."
- **Mark Ready** clears it off the kitchen screen (it still shows on the front-counter Live
  Orders board as "Ready" for handoff).

No prices, no analytics, no customer contact info — kept deliberately minimal.

---

## Viewing Today's Sales (`/admin/dashboard`)

The dashboard shows, updated live: today's sales total, order count, average order value, and a
pickup-vs-delivery split, plus a live count of orders in each status.

## Viewing Sales for Other Date Ranges (`/admin/sales`)

Tap any of the date filter pills — **Today, Yesterday, This Week, This Month, Last Month, Custom
Range**. For Custom Range, two date pickers appear. The page shows total sales, order count,
average order value, items sold, pickup vs. delivery revenue, and a cash/GCash/card breakdown.

## Viewing Monthly Analytics (`/admin/analytics`)

Shows the current month's sales/orders/average order value plus six charts: daily sales, orders
per day, revenue by category, revenue by product, pickup vs. delivery, and payment methods. Below
the charts, **Top Selling Products** ranks your drinks by quantity sold — filter by Today, 7 Days,
30 Days, or This Month.

## Changing the Delivery Minimum (`/admin/settings`)

Under **Delivery**, edit **Free delivery minimum**, **Delivery fee**, or **Minimum delivery
order**, then tap **Save Settings** at the bottom of the page. Customers see the new numbers on
their next visit.

## Turning Payment Methods or Order Types On/Off (`/admin/settings`)

Under **Order Settings** and **Payment Methods**, flip any toggle — e.g. turn off **Delivery**
during a rainy day, or turn off **Card** if your gateway isn't ready yet. Customers only ever see
the options you've left on.

## Exporting Data (`/admin/sales` and `/admin/customers`)

Tap **Export** (or **Orders** / **Daily Sales** on the Sales page) to download a CSV you can open
in Excel or Google Sheets.

## Customers (`/admin/customers`)

A running list of everyone who's ordered, recognized by mobile number (no account needed on
their end), sorted by total spent — useful for spotting your regulars.
