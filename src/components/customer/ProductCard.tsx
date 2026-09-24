"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProductTag } from "@/components/customer/ProductTag";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // Longer names get a smaller font so they still fit within the same
  // reserved space as short names, instead of wrapping to a taller block
  // and making that card (and its whole grid row) look mismatched.
  const isLongName = product.name.length > 18;

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;
    setAdding(true);

    try {
      // Fetch this product's option groups so we can add it with sensible
      // defaults (e.g. 12oz, 50% sugar, Regular Ice) without a full detour
      // through the customization screen -- same pattern as Grab's quick-add.
      const { data, error } = await createClient()
        .from("product_option_groups")
        .select("id, name, is_required, options:product_options(id, name, price_delta, is_default)")
        .eq("product_id", product.id);

      if (error) {
        // Don't silently add with guessed/empty options on a failed fetch --
        // send to the full customization screen instead, where the user can
        // see exactly what they're choosing.
        console.error("[ProductCard] Failed to load options for quick-add:", error);
        window.location.href = `/product/${product.id}`;
        return;
      }

      const groups = data ?? [];
      const missingRequiredDefault = groups.some(
        (g: any) => g.is_required && !g.options.some((o: any) => o.is_default)
      );

      if (missingRequiredDefault) {
        // Can't safely guess a required choice -- send them to the full
        // customization screen instead of adding something wrong.
        window.location.href = `/product/${product.id}`;
        return;
      }

      const selected_options = groups.flatMap((g: any) =>
        g.options
          .filter((o: any) => o.is_default)
          .map((o: any) => ({
            option_group_id: g.id,
            option_group_name: g.name,
            option_id: o.id,
            option_name: o.name,
            price_delta: Number(o.price_delta),
          }))
      );

      addItem({
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url,
        base_price: product.base_price,
        quantity: 1,
        selected_options,
      });

      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      console.error("[ProductCard] Quick-add failed:", err);
      window.location.href = `/product/${product.id}`;
    } finally {
      // Runs on every path -- success, handled error, or thrown exception --
      // so the button can never get stuck disabled.
      setAdding(false);
    }
  }

  return (
    <Link href={`/product/${product.id}`} className="block h-full">
      <Card className="h-full flex flex-col overflow-hidden active:scale-[0.98] transition-transform">
        <div className="relative aspect-square bg-brand-light">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 200px"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-brand/40 text-4xl">
              ☕
            </div>
          )}

          <button
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
            disabled={adding}
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-brand text-cream flex items-center justify-center shadow-card-hover disabled:opacity-70"
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3
            className={`font-headline font-semibold text-ink leading-snug line-clamp-2 min-h-[2.5rem] ${
              isLongName ? "text-xs" : "text-sm"
            }`}
          >
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
            <ProductTag product={product} />
            <p className="font-semibold text-brand-dark shrink-0 ml-auto">
              {product.base_price.toFixed(0)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
