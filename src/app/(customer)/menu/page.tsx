import { createServerReadClient } from "@/lib/supabase/server";
import { MenuClient } from "@/components/customer/MenuClient";
import type { Category, Product } from "@/lib/types";

export const revalidate = 0; // menu can change anytime from the admin dashboard

export default async function MenuPage() {
  const supabase = createServerReadClient();

  const [
    { data: categories, error: categoriesError },
    { data: products, error: productsError },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, image_url, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, category_id, sku, name, description, base_price, image_url, is_active, is_bestseller, is_featured, is_must_try, is_sample_data, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase.auth.getUser(),
  ]);

  // Surface the real reason the menu is empty instead of silently falling
  // back to []. This always logs server-side (visible in your `npm run dev`
  // terminal, or Vercel's function logs in production) so a misconfigured
  // Supabase connection is obvious immediately instead of looking like a
  // frontend bug.
  if (categoriesError) {
    console.error("[/menu] Failed to load categories:", categoriesError);
  }
  if (productsError) {
    console.error("[/menu] Failed to load products:", productsError);
  }
  if (!categoriesError && (categories?.length ?? 0) === 0) {
    console.warn(
      "[/menu] Supabase returned 0 active categories. This means the connection worked but the " +
        "table is empty (or every row has is_active = false) -- almost always means " +
        "supabase/seed/seed.sql hasn't been run yet (or was run before all 5 migration files), " +
        "not a code issue. See README.md 'Troubleshooting' section."
    );
  }

  // If a signed-in admin/staff member happens to be browsing the public menu
  // (e.g. previewing it), surface a quiet edit shortcut on the bestseller
  // spotlight. Customers never see this -- it's just an unauthenticated
  // read, so it costs nothing when nobody's signed in.
  let isAdmin = false;
  if (user) {
    const { data: admin } = await supabase
      .from("admins")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(admin?.is_active);
  }

  // Dev-only on-page diagnostic -- never shown in production, never shown to
  // customers, but saves a trip to the terminal while you're getting this
  // running locally.
  const debugMessage =
    process.env.NODE_ENV !== "production"
      ? categoriesError?.message ??
        productsError?.message ??
        ((categories?.length ?? 0) === 0
          ? "0 active categories returned from Supabase. Check: (1) .env.local has your real project URL/keys and the dev server was restarted after editing it, (2) all 5 migrations + seed.sql have been run in the Supabase SQL editor, (3) Table Editor -> categories actually has rows with is_active = true."
          : null)
      : null;

  return (
    <>
      {debugMessage && (
        <div className="bg-red-50 text-red-700 text-xs px-4 py-3 border-b border-red-200">
          <strong>Dev-only notice (hidden in production):</strong> {debugMessage}
        </div>
      )}
      <MenuClient
        categories={(categories as Category[]) ?? []}
        products={(products as Product[]) ?? []}
        isAdmin={isAdmin}
      />
    </>
  );
}
