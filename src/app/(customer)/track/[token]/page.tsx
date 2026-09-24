"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { stepsFor, currentStepIndex } from "@/lib/order-status";
import { formatManilaTime } from "@/lib/manila-time";
import type { FulfillmentType, OrderStatus } from "@/lib/types";

interface TrackedOrder {
  order_number: number;
  fulfillment_type: FulfillmentType;
  pickup_time_type: "asap" | "scheduled" | null;
  scheduled_pickup_at: string | null;
  status: OrderStatus;
  payment_method: "cash" | "gcash" | "card";
  payment_status: "pending" | "paid" | "failed" | "refunded";
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

function formatScheduledTime(iso: string | null) {
  if (!iso) return null;
  return formatManilaTime(new Date(iso));
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
            prev
              ? {
                  ...prev,
                  status: payload.new.status as OrderStatus,
                  payment_status: payload.new.payment_status as TrackedOrder["payment_status"],
                }
              : prev
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
  const isFinalStepActive = activeIndex === steps.length - 1;
  const scheduledLabel =
    order.pickup_time_type === "scheduled" ? formatScheduledTime(order.scheduled_pickup_at) : null;
  const awaitingGcashPayment = order.payment_method === "gcash" && order.payment_status === "pending";

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-headline text-2xl font-bold text-brand-dark text-center">
        Order #{order.order_number}
      </h1>
      <p className="text-center text-ink-muted text-sm mt-1">
        {order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"}
      </p>
      {scheduledLabel && (
        <p className="flex items-center justify-center gap-1 text-center text-clay text-xs font-medium mt-1">
          <Clock size={12} />
          Scheduled for {scheduledLabel}
        </p>
      )}

      {cancelled ? (
        <Card className="mt-6 p-4 text-center text-red-600">This order was cancelled.</Card>
      ) : awaitingGcashPayment ? (
        <Card className="mt-6 p-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-clay/15 flex items-center justify-center mb-2 step-pulse">
            <Clock size={18} className="text-clay" />
          </div>
          <p className="font-medium text-ink">Confirming your GCash payment</p>
          <p className="text-sm text-ink-muted mt-1">
            We'll start preparing your order as soon as your payment is confirmed. This page
            updates automatically — no need to refresh.
          </p>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-0">
          {steps.map((step, i) => {
            const done = i <= activeIndex;
            const isCurrent = i === activeIndex;
            const isLast = i === steps.length - 1;
            // The segment leading OUT of the current step is the one "in
            // motion" toward the next step -- everything before it is fully
            // done, everything after is still pending.
            const segmentInProgress = i === activeIndex && !isFinalStepActive;
            const segmentDone = i < activeIndex;

            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`relative h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-700 ${
                      done ? "bg-brand text-cream" : "bg-ink/10 text-ink-muted"
                    } ${isCurrent && !isFinalStepActive ? "step-pulse" : ""}`}
                  >
                    {done ? <Check size={16} /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-8 transition-colors duration-700 ${
                        segmentDone
                          ? "bg-brand"
                          : segmentInProgress
                            ? "progress-line-active"
                            : "bg-ink/10"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-8">
                  <p className={`font-medium transition-colors duration-700 ${done ? "text-ink" : "text-ink-muted"}`}>
                    {step.label}
                  </p>
                  {isCurrent && !isFinalStepActive && (
                    <p className="text-xs text-brand-dark mt-0.5">In progress…</p>
                  )}
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
          <span>{order.total.toFixed(0)}</span>
        </div>
      </Card>
    </main>
  );
}
