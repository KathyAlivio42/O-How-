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

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;
    setAdding(true);

    // Fetch this product's option groups so we can add it with sensible
    // defaults (e.g. 12oz, 50% sugar, Regular Ice) without a full detour
    // through the customization screen -- same pattern as Grab's quick-add.
    const { data } = await createClient()
      .from("product_option_groups")
      .select("id, name, is_required, options:product_options(id, name, price_delta, is_default)")
      .eq("product_id", product.id);

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

    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden active:scale-[0.98] transition-transform">
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
        <div className="p-3">
          <h3 className="font-headline font-semibold text-ink text-sm leading-snug">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <ProductTag product={product} />
            <p className="font-semibold text-brand-dark shrink-0 ml-auto">
              ₱{product.base_price.toFixed(0)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
