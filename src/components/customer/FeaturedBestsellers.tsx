"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ProductTag } from "@/components/customer/ProductTag";
import type { Product } from "@/lib/types";

export function FeaturedBestsellers({
  products,
  isAdmin,
}: {
  products: Product[];
  isAdmin: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <div className="px-4 mt-3 mb-5">
      <h2 className="font-headline font-semibold text-ink mb-2 px-1">Best Sellers</h2>
      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="relative flex gap-3 rounded-2xl bg-white border border-ink/5 shadow-card p-3"
          >
            <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-brand-light">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-brand/40 text-2xl">
                  ☕
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <ProductTag product={product} />
              <h3 className="font-headline font-semibold text-ink mt-1 truncate">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                  {product.description}
                </p>
              )}
              <p className="font-semibold text-brand-dark text-sm mt-1">
                {product.base_price.toFixed(0)}
              </p>
            </div>

            {isAdmin && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/admin/menu";
                }}
                role="button"
                aria-label={`Edit ${product.name} in admin`}
                className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-ink-muted shadow-card"
              >
                <Pencil size={14} />
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
