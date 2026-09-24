import { createServerReadClient } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { startOfManilaDayUTC } from "@/lib/manila-time";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = createServerReadClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, fulfillment_type, pickup_time_type, scheduled_pickup_at, payment_method, payment_status, total, status, created_at"
    )
    .gte("created_at", startOfManilaDayUTC().toISOString())
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 pt-6 pb-10">
      <h1 className="font-headline text-2xl font-bold text-brand-dark mb-5">Live Orders</h1>
      <OrdersBoard initialOrders={orders ?? []} />
    </div>
  );
}
