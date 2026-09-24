import { createServerReadClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/admin/MenuManager";
import type { Category, Product } from "@/lib/types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const supabase = createServerReadClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").order("sort_order"),
  ]);

  return (
    <MenuManager
      categories={(categories as Category[]) ?? []}
      products={(products as Product[]) ?? []}
    />
  );
}
