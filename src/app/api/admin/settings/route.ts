import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const settingsSchema = z.object({
  business_name: z.string().trim().min(1).max(120).optional(),
  logo_url: z.string().url().nullable().optional(),
  contact_number: z.string().trim().max(30).nullable().optional(),
  business_address: z.string().trim().max(300).nullable().optional(),
  accepting_orders: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  delivery_enabled: z.boolean().optional(),
  scheduled_orders_enabled: z.boolean().optional(),
  cash_enabled: z.boolean().optional(),
  gcash_enabled: z.boolean().optional(),
  card_enabled: z.boolean().optional(),
  free_delivery_minimum: z.number().min(0).optional(),
  delivery_fee: z.number().min(0).optional(),
  minimum_delivery_order: z.number().min(0).optional(),
  estimated_pickup_minutes: z.number().int().min(0).optional(),
  estimated_delivery_minutes: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request) {
  const authResult = await requireAdmin(true); // full admin only — not staff
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  let input;
  try {
    input = settingsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid settings data." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("business_settings").update(input).eq("id", true);

  if (error) {
    return NextResponse.json({ error: "Could not update settings." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
