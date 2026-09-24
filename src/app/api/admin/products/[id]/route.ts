import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api-error";

// Accepts either a full URL (https://...) or a root-relative local path
// (/images/...) -- the seed data intentionally uses the latter for images
// that ship with the app, while uploads go through Supabase Storage and get
// full URLs. A strict `.url()` check rejects the relative form outright.
const imageRefSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || val.startsWith("/") || /^https?:\/\//.test(val), {
    message: "Must be a full URL (https://...) or a path starting with /",
  });

// Every field optional — this powers quick single-field toggles (bestseller,
// active) as well as full edits from the product form.
const productUpdateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  base_price: z.number().min(0).optional(),
  image_url: imageRefSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  is_bestseller: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_must_try: z.boolean().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
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
      input = productUpdateSchema.parse(await request.json());
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid product data.", details: err instanceof Error ? err.message : err },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("products").update(input).eq("id", params.id);

    if (error) {
      console.error("[PATCH /api/admin/products/[id]] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/admin/products/[id]", err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const supabase = createAdminClient();
    // Soft-delete by default: order_items references products with ON DELETE
    // SET NULL, so a hard delete is safe too, but disabling preserves history
    // and lets the owner "undo" instead of losing the product entirely.
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", params.id);

    if (error) {
      console.error("[DELETE /api/admin/products/[id]] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("DELETE /api/admin/products/[id]", err);
  }
}
