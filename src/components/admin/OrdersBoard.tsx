"use client";

import { useEffect, useState } from "react";
import { Clock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ToastStack, type ToastMessage } from "@/components/admin/ToastStack";
import { playScheduledOrderAlert } from "@/lib/notify-sound";
import { formatManilaTime } from "@/lib/manila-time";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

interface BoardOrder {
  id: string;
  order_number: number;
  customer_name: string;
  fulfillment_type: "pickup" | "delivery";
  pickup_time_type: "asap" | "scheduled" | null;
  scheduled_pickup_at: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
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

function formatScheduledTime(iso: string | null) {
  if (!iso) return null;
  return formatManilaTime(new Date(iso));
}

function needsPaymentConfirmation(order: BoardOrder) {
  return order.payment_method === "gcash" && order.payment_status !== "paid";
}

export function OrdersBoard({ initialOrders }: { initialOrders: BoardOrder[] }) {
  const [orders, setOrders] = useState<BoardOrder[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as BoardOrder;
            setOrders((prev) => [newOrder, ...prev]);

            // Active alert for scheduled pickups specifically -- these need
            // a human to notice and plan for, unlike a routine ASAP order.
            if (newOrder.pickup_time_type === "scheduled") {
              const time = formatScheduledTime(newOrder.scheduled_pickup_at);
              setToasts((prev) => [
                ...prev,
                {
                  id: `${newOrder.id}-${Date.now()}`,
                  text: `Order #${newOrder.order_number} requests pickup at ${time}.`,
                },
              ]);
              playScheduledOrderAlert();
            }
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

  async function confirmPayment(orderId: string) {
    setUpdatingId(orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status: "paid" } : o))
    );
    await fetch(`/api/orders/${orderId}/payment-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: "paid" }),
    });
    setUpdatingId(null);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
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
                {columnOrders.map((order) => {
                  const scheduledLabel =
                    order.pickup_time_type === "scheduled"
                      ? formatScheduledTime(order.scheduled_pickup_at)
                      : null;
                  const awaitingPayment = needsPaymentConfirmation(order);
                  return (
                    <Card
                      key={order.id}
                      className={`p-3 border-l-4 ${
                        awaitingPayment
                          ? "border-l-red-500"
                          : scheduledLabel
                            ? "border-l-clay"
                            : "border-l-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-ink">#{order.order_number}</span>
                        <span className="text-xs text-ink-muted capitalize">
                          {order.fulfillment_type}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted">{order.customer_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scheduledLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-clay/15 text-clay text-xs font-medium px-2 py-0.5">
                            <Clock size={11} />
                            Scheduled {scheduledLabel}
                          </span>
                        )}
                        {awaitingPayment && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5">
                            <Wallet size={11} />
                            Awaiting GCash Payment
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-brand-dark text-sm mt-1">
                        {Number(order.total).toFixed(0)}
                      </p>

                      {awaitingPayment ? (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => confirmPayment(order.id)}
                          className="w-full mt-2 rounded-full bg-red-600 text-white font-medium text-sm px-4 py-2.5 disabled:opacity-50 hover:bg-red-700 transition-colors"
                        >
                          Confirm Payment Received
                        </button>
                      ) : (
                        col.nextStatus && (
                          <Button
                            variant="primary"
                            className="w-full mt-2"
                            disabled={updatingId === order.id}
                            onClick={() => advanceStatus(order.id, col.nextStatus!)}
                          >
                            {col.nextLabel}
                          </Button>
                        )
                      )}
                    </Card>
                  );
                })}
                {columnOrders.length === 0 && (
                  <p className="text-xs text-ink-muted">No orders here.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
