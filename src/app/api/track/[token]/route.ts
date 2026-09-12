import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `order_number, fulfillment_type, status, subtotal, delivery_fee, total,
       payment_method, payment_status, created_at, scheduled_pickup_at,
       delivery_address, delivery_landmark,
       order_items ( id, product_name_snapshot, quantity, line_total,
         order_item_options ( option_name_snapshot ) )`
    )
    .eq("tracking_token", params.token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order });
}
