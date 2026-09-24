import type { Product } from "@/lib/types";

export function ProductTag({
  product,
  className = "",
}: {
  product: Pick<Product, "is_bestseller" | "is_must_try">;
  className?: string;
}) {
  if (product.is_bestseller) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-clay/15 text-clay text-xs font-medium px-2.5 py-1 ${className}`}
      >
        🔥 Bestseller
      </span>
    );
  }
  if (product.is_must_try) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-brand text-cream text-xs font-medium px-2.5 py-1 ${className}`}
      >
        ✨ Must Try
      </span>
    );
  }
  return null;
}
