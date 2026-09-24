import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
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
      input = categoryUpdateSchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid category data." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("categories").update(input).eq("id", params.id);

    if (error) {
      console.error("[PATCH /api/admin/categories/[id]] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/admin/categories/[id]", err);
  }
}
