import { notFound } from "next/navigation";
import { createServerReadClient } from "@/lib/supabase/server";
import { ProductCustomizer } from "@/components/customer/ProductCustomizer";
import type { Product } from "@/lib/types";

export const revalidate = 0;

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerReadClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      `id, category_id, sku, name, description, base_price, image_url,
       is_active, is_bestseller, is_featured, is_must_try, is_sample_data, sort_order,
       option_groups:product_option_groups (
         id, product_id, name, is_required, allow_multiple, sort_order,
         options:product_options ( id, option_group_id, name, price_delta, is_default, is_active, sort_order )
       )`
    )
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  // Sort nested arrays (Supabase doesn't guarantee nested order without a view)
  const typedProduct = product as unknown as Product;
  typedProduct.option_groups = (typedProduct.option_groups ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      ...g,
      options: [...g.options].sort((a, b) => a.sort_order - b.sort_order),
    }));

  return <ProductCustomizer product={typedProduct} />;
}
