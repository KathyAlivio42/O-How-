import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  sort_order: z.number().int().default(0),
});

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    let input;
    try {
      input = categorySchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid category data." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert(input)
      .select("id")
      .single();

    if (error || !data) {
      console.error("[POST /api/admin/categories] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create category." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return handleApiError("POST /api/admin/categories", err);
  }
}
