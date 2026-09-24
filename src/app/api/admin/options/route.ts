import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const newOptionSchema = z.object({
  option_group_id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  price_delta: z.number().min(0).default(0),
  is_default: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    let input;
    try {
      input = newOptionSchema.parse(await request.json());
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid option data.", details: err instanceof Error ? err.message : err },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Keep sort_order continuous: put the new option after the current
    // highest in its group instead of leaving it at 0 (which would put it
    // first, ahead of existing options, looking like a re-order bug).
    const { data: existing } = await supabase
      .from("product_options")
      .select("sort_order")
      .eq("option_group_id", input.option_group_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (existing?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("product_options")
      .insert({ ...input, sort_order: nextSortOrder, is_active: true })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[POST /api/admin/options] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not add option." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id, sort_order: nextSortOrder });
  } catch (err) {
    return handleApiError("POST /api/admin/options", err);
  }
}
