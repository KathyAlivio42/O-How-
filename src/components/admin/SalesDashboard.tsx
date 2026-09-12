"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  resolveDateRange,
  DATE_RANGE_LABELS,
  type DateRangeKey,
} from "@/lib/date-range";

interface OrderRow {
  id: string;
  total: number;
  fulfillment_type: "pickup" | "delivery";
  payment_method: "cash" | "gcash" | "card";
  status: string;
  order_items: { quantity: number }[];
}

const RANGE_OPTIONS: DateRangeKey[] = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "custom",
];

export function SalesDashboard() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rangeKey === "custom" && (!customStart || !customEnd)) return;

    let range;
    try {
      range = resolveDateRange(
        rangeKey,
        rangeKey === "custom" ? { start: customStart, end: customEnd } : undefined
      );
    } catch {
      return;
    }

    setLoading(true);
    createClient()
      .from("orders")
      .select("id, total, fulfillment_type, payment_method, status, order_items(quantity)")
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString())
      .neq("status", "cancelled")
      .then(({ data }) => {
        setOrders((data as unknown as OrderRow[]) ?? []);
        setLoading(false);
      });
  }, [rangeKey, customStart, customEnd]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const itemsSold = orders.reduce(
      (s, o) => s + o.order_items.reduce((si, i) => si + i.quantity, 0),
      0
    );
    const pickupRevenue = orders
      .filter((o) => o.fulfillment_type === "pickup")
      .reduce((s, o) => s + Number(o.total), 0);
    const deliveryRevenue = orders
      .filter((o) => o.fulfillment_type === "delivery")
      .reduce((s, o) => s + Number(o.total), 0);
    const cash = orders.filter((o) => o.payment_method === "cash").reduce((s, o) => s + Number(o.total), 0);
    const gcash = orders.filter((o) => o.payment_method === "gcash").reduce((s, o) => s + Number(o.total), 0);
    const card = orders.filter((o) => o.payment_method === "card").reduce((s, o) => s + Number(o.total), 0);

    return {
      totalSales,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      itemsSold,
      pickupRevenue,
      deliveryRevenue,
      cash,
      gcash,
      card,
    };
  }, [orders]);

  return (
    <div className="px-5 pt-6 pb-10 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-headline text-2xl font-bold text-brand-dark">Sales</h1>
        <div className="flex gap-2">
          <a href="/api/admin/export?type=orders" target="_blank" rel="noreferrer">
            <Button variant="ghost">
              <Download size={16} /> Orders
            </Button>
          </a>
          <a href="/api/admin/export?type=sales" target="_blank" rel="noreferrer">
            <Button variant="ghost">
              <Download size={16} /> Daily Sales
            </Button>
          </a>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
        {RANGE_OPTIONS.map((key) => (
          <button
            key={key}
            onClick={() => setRangeKey(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              rangeKey === key ? "bg-brand text-cream" : "bg-white text-ink-muted border border-ink/10"
            }`}
          >
            {DATE_RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      {rangeKey === "custom" && (
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <input
            type="date"
            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-ink-muted text-sm py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[
              ["Total Sales", `₱${stats.totalSales.toFixed(0)}`],
              ["Total Orders", stats.totalOrders],
              ["Average Order Value", `₱${stats.avgOrderValue.toFixed(0)}`],
              ["Items Sold", stats.itemsSold],
            ].map(([label, value]) => (
              <Card key={label as string} className="p-4">
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="font-headline font-bold text-xl text-ink mt-1">{value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card className="p-4">
              <p className="text-xs text-ink-muted mb-1">Pickup Revenue</p>
              <p className="font-semibold text-ink">₱{stats.pickupRevenue.toFixed(0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted mb-1">Delivery Revenue</p>
              <p className="font-semibold text-ink">₱{stats.deliveryRevenue.toFixed(0)}</p>
            </Card>
          </div>

          <h2 className="font-headline font-semibold text-ink mt-6 mb-3">Payment Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-ink-muted">Cash</p>
              <p className="font-semibold text-ink mt-1">₱{stats.cash.toFixed(0)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-ink-muted">GCash</p>
              <p className="font-semibold text-ink mt-1">₱{stats.gcash.toFixed(0)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-ink-muted">Card</p>
              <p className="font-semibold text-ink mt-1">₱{stats.card.toFixed(0)}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
