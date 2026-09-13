"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export function UpsellRow({ products }: { products: Product[] }) {
  const { addItem } = useCart();

  if (products.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-headline font-semibold text-ink px-1">Want something else?</h3>
      <p className="text-xs text-ink-muted px-1 mb-2">Frequently ordered together</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() =>
              addItem({
                product_id: p.id,
                product_name: p.name,
                product_image_url: p.image_url,
                base_price: p.base_price,
                quantity: 1,
                selected_options: [],
              })
            }
            className="shrink-0 w-28 rounded-2xl bg-white border border-ink/10 p-2 text-left shadow-card"
          >
            <div className="relative h-16 w-full rounded-xl overflow-hidden bg-brand-light">
              {p.image_url ? (
                <Image src={p.image_url} alt={p.name} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-brand/40">☕</div>
              )}
            </div>
            <p className="text-xs font-medium text-ink mt-1.5 truncate">{p.name}</p>
            <p className="text-xs text-brand-dark font-semibold">+₱{p.base_price.toFixed(0)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
