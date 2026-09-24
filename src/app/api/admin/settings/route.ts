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

const settingsSchema = z.object({
  business_name: z.string().trim().min(1).max(120).optional(),
  logo_url: imageRefSchema.nullable().optional(),
  gcash_qr_url: imageRefSchema.nullable().optional(),
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
  try {
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
      console.error("[PATCH /api/admin/settings] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError("PATCH /api/admin/settings", err);
  }
}
