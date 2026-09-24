import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const bodySchema = z.object({
  status: z.enum([
    "new",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify the caller is a logged-in, active admin/staff member.
    const sessionClient = createRouteHandlerClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { data: admin } = await sessionClient
      .from("admins")
      .select("id, is_active")
      .eq("id", user.id)
      .single();

    if (!admin?.is_active) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // 2. Validate and apply the update using the service-role client.
    let body;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .update({ status: body.status })
      .eq("id", params.id)
      .select("id")
      .single();

    if (error || !order) {
      console.error("[PATCH /api/orders/[id]/status] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not update order." },
        { status: 500 }
      );
    }

    await supabase.from("order_status_history").insert({
      order_id: params.id,
      status: body.status,
      changed_by: admin.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/orders/[id]/status", err);
  }
}
