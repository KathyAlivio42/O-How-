import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNextControlFlowError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `order_number, fulfillment_type, status, subtotal, delivery_fee, total,
         payment_method, payment_status, created_at, pickup_time_type, scheduled_pickup_at,
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
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    // Customer-facing -- log full detail server-side, never expose it.
    console.error("[GET /api/track/[token]] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
