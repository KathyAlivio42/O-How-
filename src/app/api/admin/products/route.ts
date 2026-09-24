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

const productSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  base_price: z.number().min(0),
  image_url: imageRefSchema.optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  is_bestseller: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_must_try: z.boolean().default(false),
  sku: z.string().trim().max(60).optional(),
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
      input = productSchema.parse(await request.json());
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid product data.", details: err instanceof Error ? err.message : err },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .insert({ ...input, image_url: input.image_url || null, is_sample_data: false })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[POST /api/admin/products] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create product." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return handleApiError("POST /api/admin/products", err);
  }
}
