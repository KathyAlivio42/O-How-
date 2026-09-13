"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import {
  resolveDateRange,
  DATE_RANGE_LABELS,
  type DateRangeKey,
} from "@/lib/date-range";

const CHART_COLORS = ["#5B6E42", "#B9773F", "#8FA06E", "#D9A968", "#3B4A2A", "#C9B896"];

interface OrderRow {
  id: string;
  created_at: string;
  fulfillment_type: "pickup" | "delivery";
  payment_method: "cash" | "gcash" | "card";
  total: number;
}

interface ItemRow {
  order_id: string;
  quantity: number;
  line_total: number;
  product_name_snapshot: string;
  products: { name: string; categories: { name: string } | null } | null;
}

const TOP_PRODUCT_RANGES: DateRangeKey[] = ["today", "last_7_days", "last_30_days", "this_month"];

export function AnalyticsDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [topRange, setTopRange] = useState<DateRangeKey>("this_month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthRange = resolveDateRange("this_month");
    const supabase = createClient();

    supabase
      .from("orders")
      .select("id, created_at, fulfillment_type, payment_method, total")
      .gte("created_at", monthRange.start.toISOString())
      .lt("created_at", monthRange.end.toISOString())
      .neq("status", "cancelled")
      .then(async ({ data: orderData }) => {
        const rows = (orderData as OrderRow[]) ?? [];
        setOrders(rows);

        if (rows.length > 0) {
          const { data: itemData } = await supabase
            .from("order_items")
            .select("order_id, quantity, line_total, product_name_snapshot, products(name, categories(name))")
            .in(
              "order_id",
              rows.map((r) => r.id)
            );
          setItems((itemData as unknown as ItemRow[]) ?? []);
        }
        setLoading(false);
      });
  }, []);

  const monthlySales = orders.reduce((s, o) => s + Number(o.total), 0);
  const monthlyOrders = orders.length;
  const monthlyAOV = monthlyOrders > 0 ? monthlySales / monthlyOrders : 0;

  const dailySales = useMemo(() => {
    const byDay = new Map<string, { sales: number; orders: number }>();
    orders.forEach((o) => {
      const day = o.created_at.slice(5, 10); // MM-DD
      const cur = byDay.get(day) ?? { sales: 0, orders: 0 };
      cur.sales += Number(o.total);
      cur.orders += 1;
      byDay.set(day, cur);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v }));
  }, [orders]);

  const revenueByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    items.forEach((i) => {
      const catName = i.products?.categories?.name ?? "Other";
      byCategory.set(catName, (byCategory.get(catName) ?? 0) + Number(i.line_total));
    });
    return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
  }, [items]);

  const revenueByProduct = useMemo(() => {
    const byProduct = new Map<string, number>();
    items.forEach((i) => {
      const name = i.products?.name ?? i.product_name_snapshot;
      byProduct.set(name, (byProduct.get(name) ?? 0) + Number(i.line_total));
    });
    return Array.from(byProduct.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const fulfillmentSplit = useMemo(() => {
    const pickup = orders.filter((o) => o.fulfillment_type === "pickup").length;
    const delivery = orders.filter((o) => o.fulfillment_type === "delivery").length;
    return [
      { name: "Pickup", value: pickup },
      { name: "Delivery", value: delivery },
    ];
  }, [orders]);

  const paymentSplit = useMemo(() => {
    const cash = orders.filter((o) => o.payment_method === "cash").length;
    const gcash = orders.filter((o) => o.payment_method === "gcash").length;
    const card = orders.filter((o) => o.payment_method === "card").length;
    return [
      { name: "Cash", value: cash },
      { name: "GCash", value: gcash },
      { name: "Card", value: card },
    ];
  }, [orders]);

  const topSellers = useMemo(() => {
    // Filtered from the same month's items — good enough approximation for
    // "today"/"7 days" within the current month; a custom range spanning
    // months would need its own fetch, left as a follow-up.
    const range = resolveDateRange(topRange === "custom" ? "this_month" : topRange);
    const validOrderIds = new Set(
      orders.filter((o) => new Date(o.created_at) >= range.start && new Date(o.created_at) < range.end).map((o) => o.id)
    );
    const byProduct = new Map<string, { qty: number; revenue: number }>();
    items
      .filter((i) => validOrderIds.has(i.order_id))
      .forEach((i) => {
        const name = i.products?.name ?? i.product_name_snapshot;
        const cur = byProduct.get(name) ?? { qty: 0, revenue: 0 };
        cur.qty += i.quantity;
        cur.revenue += Number(i.line_total);
        byProduct.set(name, cur);
      });
    return Array.from(byProduct.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [items, orders, topRange]);

  if (loading) {
    return <div className="px-5 pt-6 text-ink-muted text-sm">Loading…</div>;
  }

  return (
    <div className="px-5 pt-6 pb-10 max-w-5xl">
      <h1 className="font-headline text-2xl font-bold text-brand-dark mb-1">
        {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
      </h1>
      <p className="text-sm text-ink-muted mb-5">Monthly performance</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Sales</p>
          <p className="font-headline font-bold text-xl text-ink mt-1">₱{monthlySales.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Orders</p>
          <p className="font-headline font-bold text-xl text-ink mt-1">{monthlyOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">Average Order</p>
          <p className="font-headline font-bold text-xl text-ink mt-1">₱{monthlyAOV.toFixed(0)}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Daily Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailySales}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => `₱${v.toFixed(0)}`} />
              <Line type="monotone" dataKey="sales" stroke="#5B6E42" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailySales}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#B9773F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={revenueByCategory} dataKey="value" nameKey="name" outerRadius={70}>
                {revenueByCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `₱${v.toFixed(0)}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Revenue by Product</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByProduct} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={10} width={100} />
              <Tooltip formatter={(v: number) => `₱${v.toFixed(0)}`} />
              <Bar dataKey="value" fill="#5B6E42" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Pickup vs Delivery</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fulfillmentSplit} dataKey="value" nameKey="name" outerRadius={70}>
                {fulfillmentSplit.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-headline font-semibold text-ink mb-2 text-sm">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentSplit} dataKey="value" nameKey="name" outerRadius={70}>
                {paymentSplit.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <h2 className="font-headline font-semibold text-ink mt-8 mb-3">Top Selling Products</h2>
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {TOP_PRODUCT_RANGES.map((key) => (
          <button
            key={key}
            onClick={() => setTopRange(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              topRange === key ? "bg-brand text-cream" : "bg-white text-ink-muted border border-ink/10"
            }`}
          >
            {DATE_RANGE_LABELS[key]}
          </button>
        ))}
      </div>
      <Card className="p-4">
        <ol className="flex flex-col gap-2">
          {topSellers.map((p, i) => (
            <li key={p.name} className="flex justify-between items-center text-sm">
              <span className="text-ink">
                {i + 1}. {p.name} — {p.qty} sold
              </span>
              <span className="text-ink-muted">₱{p.revenue.toFixed(0)}</span>
            </li>
          ))}
          {topSellers.length === 0 && (
            <p className="text-ink-muted text-sm">No sales in this range yet.</p>
          )}
        </ol>
      </Card>
    </div>
  );
}
