import { redirect } from "next/navigation";
import { createServerReadClient } from "@/lib/supabase/server";
import { KitchenBoard } from "@/components/admin/KitchenBoard";

export const revalidate = 0;

export default async function KitchenPage() {
  const supabase = createServerReadClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/kitchen");

  const { data: admin } = await supabase
    .from("admins")
    .select("is_active")
    .eq("id", user.id)
    .single();
  if (!admin?.is_active) redirect("/admin/login?next=/kitchen");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `id, order_number, fulfillment_type, status,
       order_items ( id, product_name_snapshot, quantity,
         order_item_options ( option_name_snapshot ) )`
    )
    .in("status", ["new", "accepted", "preparing"])
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-brand-light/30">
      <header className="px-4 py-4 bg-white border-b border-ink/10">
        <h1 className="font-headline text-xl font-bold text-brand-dark">Kitchen</h1>
      </header>
      <KitchenBoard initialOrders={(orders as any) ?? []} />
    </div>
  );
}
