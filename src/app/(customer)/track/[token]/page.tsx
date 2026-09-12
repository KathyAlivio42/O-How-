"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { stepsFor, currentStepIndex } from "@/lib/order-status";
import type { FulfillmentType, OrderStatus } from "@/lib/types";

interface TrackedOrder {
  order_number: number;
  fulfillment_type: FulfillmentType;
  status: OrderStatus;
  total: number;
  delivery_address: string | null;
  delivery_landmark: string | null;
  order_items: {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    order_item_options: { option_name_snapshot: string }[];
  }[];
}

export default function TrackOrderPage() {
  const params = useParams<{ token: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/track/${params.token}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.order ?? null))
      .finally(() => setLoading(false));

    // Live status updates: listen for changes to this order's row. Requires
    // Realtime to be enabled for the `orders` table in the Supabase dashboard.
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${params.token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `tracking_token=eq.${params.token}`,
        },
        (payload) => {
          setOrder((prev) =>
            prev ? { ...prev, status: payload.new.status as OrderStatus } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.token]);

  if (loading) {
    return <main className="max-w-md mx-auto px-4 py-16 text-center text-ink-muted">Loading…</main>;
  }

  if (!order) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center text-ink-muted">
        We couldn't find this order.
      </main>
    );
  }

  const steps = stepsFor(order.fulfillment_type);
  const activeIndex = currentStepIndex(order.status, order.fulfillment_type);
  const cancelled = order.status === "cancelled";

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-headline text-2xl font-bold text-brand-dark text-center">
        Order #{order.order_number}
      </h1>
      <p className="text-center text-ink-muted text-sm mt-1">
        {order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"}
      </p>

      {cancelled ? (
        <Card className="mt-6 p-4 text-center text-red-600">This order was cancelled.</Card>
      ) : (
        <div className="mt-8 flex flex-col gap-0">
          {steps.map((step, i) => {
            const done = i <= activeIndex;
            const isLast = i === steps.length - 1;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      done ? "bg-brand text-cream" : "bg-ink/10 text-ink-muted"
                    }`}
                  >
                    {done ? <Check size={16} /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-8 ${done ? "bg-brand" : "bg-ink/10"}`} />
                  )}
                </div>
                <div className="pb-8">
                  <p className={`font-medium ${done ? "text-ink" : "text-ink-muted"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="p-4 mt-2">
        <h2 className="font-headline font-semibold text-ink mb-2">Order Summary</h2>
        {order.order_items.map((item) => (
          <div key={item.id} className="text-sm py-1">
            <span className="text-ink">
              {item.quantity} × {item.product_name_snapshot}
            </span>
            {item.order_item_options.length > 0 && (
              <p className="text-xs text-ink-muted">
                {item.order_item_options.map((o) => o.option_name_snapshot).join(", ")}
              </p>
            )}
          </div>
        ))}
        <div className="border-t border-ink/10 mt-2 pt-2 flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span>₱{order.total.toFixed(0)}</span>
        </div>
      </Card>
    </main>
  );
}
