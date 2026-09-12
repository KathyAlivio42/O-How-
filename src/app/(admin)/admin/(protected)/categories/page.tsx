import { createServerReadClient } from "@/lib/supabase/server";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import type { Category } from "@/lib/types";

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = createServerReadClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return <CategoriesManager categories={(categories as Category[]) ?? []} />;
}
