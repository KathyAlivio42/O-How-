import { createServerReadClient } from "@/lib/supabase/server";
import { MenuClient } from "@/components/customer/MenuClient";
import type { Category, Product } from "@/lib/types";

export const revalidate = 0; // menu can change anytime from the admin dashboard

export default async function MenuPage() {
  const supabase = createServerReadClient();

  const [{ data: categories }, { data: products }, { data: { user } }] = await Promise.all([
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

  return (
    <MenuClient
      categories={(categories as Category[]) ?? []}
      products={(products as Product[]) ?? []}
      isAdmin={isAdmin}
    />
  );
}
