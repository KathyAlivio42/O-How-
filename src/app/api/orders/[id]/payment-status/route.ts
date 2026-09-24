import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const bodySchema = z.object({
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    let body;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error: orderError } = await supabase
      .from("orders")
      .update({ payment_status: body.payment_status })
      .eq("id", params.id);

    if (orderError) {
      console.error("[PATCH /api/orders/[id]/payment-status] Order update error:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Keep the payments table (the audit record) in sync too.
    const { error: paymentError } = await supabase
      .from("payments")
      .update({ status: body.payment_status })
      .eq("order_id", params.id);

    if (paymentError) {
      // Non-fatal: the order itself is already updated, which is what
      // gates the admin UI and the customer's tracking page. Log it for
      // visibility but don't fail the whole request over the audit copy.
      console.error("[PATCH /api/orders/[id]/payment-status] Payment record update error:", paymentError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/orders/[id]/payment-status", err);
  }
}
