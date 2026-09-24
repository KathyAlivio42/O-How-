import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const optionUpdateSchema = z.object({
  price_delta: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
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

    let input;
    try {
      input = optionUpdateSchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid option data." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("product_options").update(input).eq("id", params.id);

    if (error) {
      console.error("[PATCH /api/admin/options/[id]] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/admin/options/[id]", err);
  }
}
