import { createServerReadClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { formatManilaShortDate } from "@/lib/manila-time";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const supabase = createServerReadClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, full_name, mobile_number, order_count, total_spent, last_order_at")
    .order("total_spent", { ascending: false })
    .limit(200);

  return (
    <div className="px-5 pt-6 pb-10 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-headline text-2xl font-bold text-brand-dark">Customers</h1>
        <a href="/api/admin/export?type=customers" target="_blank" rel="noreferrer">
          <Button variant="ghost">
            <Download size={16} /> Export
          </Button>
        </a>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-brand-dark text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Orders</th>
              <th className="px-4 py-2 font-medium">Total Spent</th>
              <th className="px-4 py-2 font-medium">Last Order</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-t border-ink/5">
                <td className="px-4 py-2">
                  <p className="text-ink">{c.full_name}</p>
                  <p className="text-xs text-ink-muted">{c.mobile_number}</p>
                </td>
                <td className="px-4 py-2 text-ink">{c.order_count}</td>
                <td className="px-4 py-2 text-ink">{Number(c.total_spent).toFixed(0)}</td>
                <td className="px-4 py-2 text-ink-muted text-xs">
                  {c.last_order_at ? formatManilaShortDate(new Date(c.last_order_at)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(customers ?? []).length === 0 && (
          <p className="text-center text-ink-muted text-sm py-8">No customers yet.</p>
        )}
      </Card>
    </div>
  );
}
