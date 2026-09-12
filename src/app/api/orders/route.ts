import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceOrder } from "@/lib/pricing";
import type { CreateOrderInput } from "@/lib/types";

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  selected_option_ids: z.array(z.string().uuid()),
});

const createOrderSchema = z.object({
  fulfillment_type: z.enum(["pickup", "delivery"]),
  customer_name: z.string().trim().min(1).max(120),
  customer_mobile: z.string().trim().min(7).max(20),
  pickup_time_type: z.enum(["asap", "scheduled"]).optional(),
  scheduled_pickup_at: z.string().datetime().optional(),
  delivery_address: z.string().trim().min(1).max(300).optional(),
  delivery_landmark: z.string().trim().max(200).optional(),
  delivery_instructions: z.string().trim().max(300).optional(),
  payment_method: z.enum(["cash", "gcash", "card"]),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  let input: CreateOrderInput;
  try {
    const body = await request.json();
    input = createOrderSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid order data.", details: err instanceof Error ? err.message : err },
      { status: 400 }
    );
  }

  if (input.fulfillment_type === "delivery" && !input.delivery_address) {
    return NextResponse.json(
      { error: "Delivery address is required for delivery orders." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Check store is accepting orders + the chosen fulfillment/payment method is enabled.
  const { data: settings } = await supabase
    .from("business_settings")
    .select(
      "accepting_orders, pickup_enabled, delivery_enabled, cash_enabled, gcash_enabled, card_enabled, estimated_pickup_minutes, estimated_delivery_minutes"
    )
    .single();

  if (!settings?.accepting_orders) {
    return NextResponse.json(
      { error: "We're not accepting orders right now. Please check back soon." },
      { status: 409 }
    );
  }
  if (input.fulfillment_type === "pickup" && !settings.pickup_enabled) {
    return NextResponse.json({ error: "Pickup is currently unavailable." }, { status: 409 });
  }
  if (input.fulfillment_type === "delivery" && !settings.delivery_enabled) {
    return NextResponse.json({ error: "Delivery is currently unavailable." }, { status: 409 });
  }
  const methodEnabled =
    (input.payment_method === "cash" && settings.cash_enabled) ||
    (input.payment_method === "gcash" && settings.gcash_enabled) ||
    (input.payment_method === "card" && settings.card_enabled);
  if (!methodEnabled) {
    return NextResponse.json(
      { error: "That payment method is currently unavailable." },
      { status: 409 }
    );
  }

  // 2. Recompute pricing from the database. Throws on stale/invalid cart contents.
  let priced;
  try {
    priced = await priceOrder(supabase, input);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not price this order." },
      { status: 400 }
    );
  }

  // 3. Upsert the customer record, recognized by mobile number (no account needed).
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, order_count, total_spent")
    .eq("mobile_number", input.customer_mobile)
    .maybeSingle();

  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase
      .from("customers")
      .update({
        full_name: input.customer_name,
        order_count: existingCustomer.order_count + 1,
        total_spent: Number(existingCustomer.total_spent) + priced.total,
        last_order_at: new Date().toISOString(),
      })
      .eq("id", customerId);
  } else {
    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        full_name: input.customer_name,
        mobile_number: input.customer_mobile,
        order_count: 1,
        total_spent: priced.total,
        last_order_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Could not save customer details." }, { status: 500 });
    }
    customerId = created.id;
  }

  // 4. Create the order.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      customer_name: input.customer_name,
      customer_mobile: input.customer_mobile,
      fulfillment_type: input.fulfillment_type,
      pickup_time_type: input.pickup_time_type,
      scheduled_pickup_at: input.scheduled_pickup_at,
      delivery_address: input.delivery_address,
      delivery_landmark: input.delivery_landmark,
      delivery_instructions: input.delivery_instructions,
      subtotal: priced.subtotal,
      delivery_fee: priced.delivery_fee,
      total: priced.total,
      status: "new",
      payment_method: input.payment_method,
      payment_status: "pending",
      notes: input.notes,
    })
    .select("id, order_number, tracking_token")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Could not create the order." }, { status: 500 });
  }

  // 5. Insert line items + their option snapshots.
  for (const item of priced.items) {
    const { data: orderItem, error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })
      .select("id")
      .single();

    if (itemError || !orderItem) continue;

    if (item.options.length > 0) {
      await supabase.from("order_item_options").insert(
        item.options.map((o) => ({
          order_item_id: orderItem.id,
          option_group_name_snapshot: o.option_group_name,
          option_name_snapshot: o.option_name,
          price_delta: o.price_delta,
        }))
      );
    }
  }

  // 6. Record the payment (cash settles at handoff; gcash/card would create a
  // provider intent here once a gateway is wired up — see lib/payments).
  await supabase.from("payments").insert({
    order_id: order.id,
    method: input.payment_method,
    status: "pending",
    amount: priced.total,
    provider: input.payment_method === "cash" ? null : "unconfigured",
  });

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "new",
  });

  const estimated_minutes =
    input.fulfillment_type === "pickup"
      ? settings.estimated_pickup_minutes
      : settings.estimated_delivery_minutes;

  return NextResponse.json({
    order_number: order.order_number,
    tracking_token: order.tracking_token,
    total: priced.total,
    estimated_minutes,
  });
}
