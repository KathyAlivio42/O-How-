"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function StickyCartBar() {
  const { itemCount, subtotalEstimate } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href="/cart"
          className="flex items-center justify-between rounded-full bg-brand text-cream px-5 py-3.5 shadow-card-hover"
        >
          <span className="text-sm font-medium">
            🛒 {itemCount} item{itemCount > 1 ? "s" : ""} · ₱
            {subtotalEstimate.toFixed(0)}
          </span>
          <span className="text-sm font-semibold">View Cart</span>
        </Link>
      </div>
    </div>
  );
}
