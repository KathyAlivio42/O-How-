import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const productSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  base_price: z.number().min(0),
  image_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  is_bestseller: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_must_try: z.boolean().default(false),
  sku: z.string().trim().max(60).optional(),
  sort_order: z.number().int().default(0),
});

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "Could not create product." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
