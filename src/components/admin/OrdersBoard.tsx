"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { OrderStatus } from "@/lib/types";

interface BoardOrder {
  id: string;
  order_number: number;
  customer_name: string;
  fulfillment_type: "pickup" | "delivery";
  total: number;
  status: OrderStatus;
  created_at: string;
}

const COLUMNS: { status: OrderStatus[]; title: string; nextStatus?: OrderStatus; nextLabel?: string }[] = [
  { status: ["new", "accepted"], title: "New", nextStatus: "preparing", nextLabel: "Accept Order" },
  { status: ["preparing"], title: "Preparing", nextStatus: "ready", nextLabel: "Mark Ready" },
  { status: ["ready", "out_for_delivery"], title: "Ready", nextStatus: "completed", nextLabel: "Complete" },
  { status: ["completed"], title: "Completed" },
];

export function OrdersBoard({ initialOrders }: { initialOrders: BoardOrder[] }) {
  const [orders, setOrders] = useState<BoardOrder[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as BoardOrder, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function advanceStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    // Optimistic update so the board feels instant; the realtime event will
    // confirm it moments later.
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setUpdatingId(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const columnOrders = orders.filter((o) => col.status.includes(o.status));
        return (
          <div key={col.title}>
            <h3 className="font-headline font-semibold text-ink mb-2 flex items-center gap-2">
              {col.title}
              <span className="text-xs font-normal text-ink-muted">
                {columnOrders.length}
              </span>
            </h3>
            <div className="flex flex-col gap-3">
              {columnOrders.map((order) => (
                <Card key={order.id} className="p-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-ink">#{order.order_number}</span>
                    <span className="text-xs text-ink-muted capitalize">
                      {order.fulfillment_type}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">{order.customer_name}</p>
                  <p className="font-semibold text-brand-dark text-sm mt-1">
                    ₱{Number(order.total).toFixed(0)}
                  </p>
                  {col.nextStatus && (
                    <Button
                      variant="primary"
                      className="w-full mt-2"
                      disabled={updatingId === order.id}
                      onClick={() => advanceStatus(order.id, col.nextStatus!)}
                    >
                      {col.nextLabel}
                    </Button>
                  )}
                </Card>
              ))}
              {columnOrders.length === 0 && (
                <p className="text-xs text-ink-muted">No orders here.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
