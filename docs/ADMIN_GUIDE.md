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
Expand the product (as above) and click **Upload from computer** under the Image URL field —
pick any photo from your phone or computer (JPG/PNG, up to 5MB) and it uploads directly to
Supabase Storage and fills in the URL for you. Click **Save Changes** afterward to apply it.
You can still paste an external image URL into the text field instead if you'd rather link to a
photo hosted elsewhere.

### Manage cup sizes, sugar levels, ice, and add-on prices
Expand any product to see its **customization options** below the Save Changes button (if it
has any set up — Size, Sugar Level, Ice, Add-ons, etc.). For each option you can:
- **Toggle Available/Unavailable** — e.g. temporarily turn off "Large (22oz)" if you're out of
  large cups, without deleting the option or losing its price. Customers immediately stop seeing
  unavailable options as a choice.
- **Edit the price** — click into the price field, change the number, and click elsewhere (or
  press Tab) to save. This is the upcharge for that option — e.g. changing Medium's price from
  +20 to +25 updates every order for that product going forward.
- **Add a new option to an existing group** — tap **+ Add option** at the bottom of a group
  (e.g. Size) to add something new to it, like a "Extra Large (32oz)" tier. Give it a name and an
  upcharge, tap Add, and it's live on the customer menu immediately.

Each change saves immediately and shows "Saving…" then "Saved ✓" — if you see "Failed" instead,
try again; nothing was lost, the field resets to its last saved value.

Setting up a brand-new customization *category* — e.g. adding a "Milk Type" group to a product
that's never had one — isn't available from this screen yet; that still requires a database
change. Adding a new option *within* an existing group (a new size, a new add-on, etc.) is.

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

### Scheduled pickup orders

If a customer picks a specific pickup time instead of ASAP, you'll know immediately: a toast
notification pops up in the corner with a short chime, and the order card shows an orange
**"Scheduled 3:00 PM"** tag with a highlighted left edge so it stands out from the rest of the
board. The same tag (without the sound) also shows on the Kitchen screen, so whoever's making
drinks knows which orders have a specific target time.

Customers can only choose a pickup time between **10:00 AM and 8:00 PM**, in 15-minute steps
(10:00, 10:15, 10:30, and so on) — this range is fixed in the code rather than an admin setting
right now, so changing it requires a developer to edit `PICKUP_WINDOW_START_HOUR`/
`PICKUP_WINDOW_END_HOUR` in the checkout page and the matching check in the order API.

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

### Setting up (or changing) your GCash QR code

With **GCash** turned on in Payment Methods, a **GCash QR Code** section appears right below it.
Tap **Upload QR code** (or **Replace QR code** if you've already set one) and choose a screenshot
or photo of your shop's GCash QR from your phone or computer. You can update this any time — say,
if you switch GCash accounts — and the new code shows to customers immediately.

### How GCash orders work

When a customer chooses GCash at checkout, they see your QR code right there and scan it with
their own GCash app to pay before placing the order. Because there's no automatic way to confirm
a GCash transfer landed, **you confirm it manually**: the order shows up in Live Orders with a red
**"Awaiting GCash Payment"** tag and a red **Confirm Payment Received** button in place of the
usual Accept Order button. Check your GCash app for the incoming payment, and only then tap
**Confirm Payment Received** — that's what unlocks the order to move into Preparing like any
other order. Until you confirm it, the customer's tracking page shows "Confirming your GCash
payment" instead of the usual order steps, so they know to wait.

## Exporting Data (`/admin/sales` and `/admin/customers`)

Tap **Export** (or **Orders** / **Daily Sales** on the Sales page) to download a CSV you can open
in Excel or Google Sheets.

## Customers (`/admin/customers`)

A running list of everyone who's ordered, recognized by mobile number (no account needed on
their end), sorted by total spent — useful for spotting your regulars.
