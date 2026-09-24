"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatManilaTime } from "@/lib/manila-time";
import type { OrderStatus } from "@/lib/types";

interface KitchenOrder {
  id: string;
  order_number: number;
  fulfillment_type: "pickup" | "delivery";
  pickup_time_type: "asap" | "scheduled" | null;
  scheduled_pickup_at: string | null;
  status: OrderStatus;
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

export function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  const [orders, setOrders] = useState(
    initialOrders.filter((o) => o.status === "new" || o.status === "accepted" || o.status === "preparing")
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          const row = payload.new as { id: string; status: OrderStatus };
          if (["completed", "cancelled", "ready", "out_for_delivery"].includes(row.status)) {
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
            return;
          }
          if (row.status === "new" || row.status === "accepted" || row.status === "preparing") {
            setOrders((prev) =>
              prev.some((o) => o.id === row.id)
                ? prev.map((o) => (o.id === row.id ? { ...o, status: row.status } : o))
                : prev // new inserts still need a full row fetch; kept simple for MVP
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "ready") {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {orders.map((order) => (
        <Card key={order.id} className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-headline font-bold text-xl">#{order.order_number}</span>
            <span className="text-xs uppercase tracking-wide bg-brand-light text-brand-dark px-2 py-1 rounded-full">
              {order.fulfillment_type}
            </span>
          </div>
          {order.pickup_time_type === "scheduled" && (
            <span className="inline-flex items-center gap-1 mb-2 rounded-full bg-clay/15 text-clay text-xs font-medium px-2 py-0.5">
              <Clock size={11} />
              Scheduled {formatScheduledTime(order.scheduled_pickup_at)}
            </span>
          )}
          <ul className="text-sm text-ink flex flex-col gap-1 mb-4">
            {order.order_items.map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.quantity} ×</span> {item.product_name_snapshot}
                {item.order_item_options.length > 0 && (
                  <span className="text-ink-muted">
                    {" "}
                    ({item.order_item_options.map((o) => o.option_name_snapshot).join(", ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
          {(order.status === "new" || order.status === "accepted") && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => updateStatus(order.id, "preparing")}
            >
              Start Preparing
            </Button>
          )}
          {order.status === "preparing" && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => updateStatus(order.id, "ready")}
            >
              Mark Ready
            </Button>
          )}
        </Card>
      ))}
      {orders.length === 0 && (
        <p className="text-ink-muted text-sm col-span-full text-center py-12">
          No active orders right now.
        </p>
      )}
    </div>
  );
}
