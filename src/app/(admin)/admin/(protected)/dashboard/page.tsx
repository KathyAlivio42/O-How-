import { createServerReadClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { startOfManilaDayUTC } from "@/lib/manila-time";

export default async function AdminDashboardPage() {
  const supabase = createServerReadClient();

  const { data: todayOrders } = await supabase
    .from("orders")
    .select("total, fulfillment_type, status")
    .gte("created_at", startOfManilaDayUTC().toISOString())
    .neq("status", "cancelled");

  const orders = todayOrders ?? [];
  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const pickupCount = orders.filter((o) => o.fulfillment_type === "pickup").length;
  const deliveryCount = orders.filter((o) => o.fulfillment_type === "delivery").length;

  const liveCounts = {
    new: orders.filter((o) => o.status === "new" || o.status === "accepted").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  const stats = [
    { label: "Today's Sales", value: `${totalSales.toFixed(0)}` },
    { label: "Total Orders", value: totalOrders },
    { label: "Average Order Value", value: `${avgOrderValue.toFixed(0)}` },
    { label: "Pickup Orders", value: pickupCount },
    { label: "Delivery Orders", value: deliveryCount },
  ];

  return (
    <div className="px-5 pt-6 max-w-5xl">
      <h1 className="font-headline text-2xl font-bold text-brand-dark mb-5">Today</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="font-headline font-bold text-xl text-ink mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <h2 className="font-headline font-semibold text-ink mt-8 mb-3">Live Orders</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["New", liveCounts.new],
          ["Preparing", liveCounts.preparing],
          ["Ready", liveCounts.ready],
          ["Completed", liveCounts.completed],
        ].map(([label, count]) => (
          <Card key={label as string} className="p-4 text-center">
            <p className="font-headline font-bold text-2xl text-brand-dark">{count}</p>
            <p className="text-xs text-ink-muted mt-1">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
