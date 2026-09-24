"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { DeliveryProgress } from "@/components/customer/DeliveryProgress";
import { UpsellRow } from "@/components/customer/UpsellRow";
import type { BusinessSettings, Product } from "@/lib/types";

export default function CartPage() {
  const { items, updateQuantity, removeItem, fulfillmentType, subtotalEstimate } =
    useCart();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("business_settings")
      .select(
        "business_name, logo_url, primary_color, contact_number, business_address, business_hours, accepting_orders, pickup_enabled, delivery_enabled, scheduled_orders_enabled, cash_enabled, gcash_enabled, card_enabled, free_delivery_minimum, delivery_fee, minimum_delivery_order, estimated_pickup_minutes, estimated_delivery_minutes"
      )
      .single()
      .then(({ data }) => setSettings(data as BusinessSettings));

    if (items.length > 0) {
      const productIds = items.map((i) => i.product_id);
      supabase
        .from("product_recommendations")
        .select("recommended_product_id, products:recommended_product_id(*)")
        .in("product_id", productIds)
        .then(({ data }) => {
          const products = (data ?? [])
            .map((r: any) => r.products)
            .filter((p: any) => p && !productIds.includes(p.id));
          // de-dupe
          const unique = Array.from(
            new Map(products.map((p: any) => [p.id, p])).values()
          ) as Product[];
          setRecommended(unique.slice(0, 6));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const showDeliveryProgress =
    fulfillmentType === "delivery" && settings && items.length > 0;

  return (
    <main className="max-w-md mx-auto pb-32 min-h-screen">
      <header className="px-4 pt-6 pb-2 flex items-center gap-3">
        <Link href="/menu" aria-label="Back to menu">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-headline text-2xl font-bold text-brand-dark">Your Cart</h1>
      </header>

      {items.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-ink-muted">Your cart is empty.</p>
          <Link href="/menu" className="inline-block mt-4">
            <Button variant="primary">Browse the Menu</Button>
          </Link>
        </div>
      ) : (
        <div className="px-4">
          {showDeliveryProgress && (
            <div className="mb-4">
              <DeliveryProgress
                subtotal={subtotalEstimate}
                freeDeliveryMinimum={settings!.free_delivery_minimum}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const optionsTotal = item.selected_options.reduce(
                (s, o) => s + o.price_delta,
                0
              );
              const lineTotal = (item.base_price + optionsTotal) * item.quantity;
              return (
                <div
                  key={item.cart_item_id}
                  className="flex gap-3 bg-white rounded-2xl border border-ink/5 shadow-card p-3"
                >
                  <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-brand-light">
                    {item.product_image_url ? (
                      <Image
                        src={item.product_image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-brand/40">
                        ☕
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm">{item.product_name}</p>
                    {item.selected_options.length > 0 && (
                      <p className="text-xs text-ink-muted truncate">
                        {item.selected_options.map((o) => o.option_name).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-brand-light rounded-full px-2 py-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.cart_item_id, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cart_item_id, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-semibold text-brand-dark text-sm">
                        {lineTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.cart_item_id)}
                    aria-label={`Remove ${item.product_name}`}
                    className="text-ink-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <UpsellRow products={recommended} />

          <Link href="/menu" className="block text-center text-sm text-brand-dark font-medium mt-6">
            + Continue Shopping
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-cream border-t border-ink/10 px-5 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-ink-muted">Subtotal</p>
              <p className="font-semibold text-lg text-ink">{subtotalEstimate.toFixed(0)}</p>
            </div>
            <Link href="/checkout" className="flex-1">
              <Button variant="primary" size="lg" className="w-full">
                Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
