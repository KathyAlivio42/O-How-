import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateOrderInput } from "@/lib/types";

export interface PricedOptionLine {
  option_group_name: string;
  option_name: string;
  price_delta: number;
}

export interface PricedItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  options: PricedOptionLine[];
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
}

/**
 * Recomputes every price from the database. This is the ONLY place order
 * totals are decided — the client-submitted cart carries product/option IDs
 * and quantities only, never amounts. Throws if a product/option is inactive
 * or doesn't exist, so a stale client cart can't sneak in a removed item.
 */
export async function priceOrder(
  supabase: SupabaseClient,
  input: CreateOrderInput
): Promise<PricedOrder> {
  if (input.items.length === 0) {
    throw new Error("Cannot price an empty order.");
  }

  const productIds = [...new Set(input.items.map((i) => i.product_id))];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, base_price, is_active")
    .in("id", productIds);

  if (productsError) throw productsError;

  const productMap = new Map(products?.map((p) => [p.id, p]) ?? []);

  const allOptionIds = [
    ...new Set(input.items.flatMap((i) => i.selected_option_ids)),
  ];

  const { data: options, error: optionsError } =
    allOptionIds.length > 0
      ? await supabase
          .from("product_options")
          .select(
            "id, name, price_delta, is_active, option_group_id, product_option_groups(name, product_id)"
          )
          .in("id", allOptionIds)
      : { data: [] as any[], error: null };

  if (optionsError) throw optionsError;

  const optionMap = new Map((options ?? []).map((o: any) => [o.id, o]));

  const items: PricedItem[] = input.items.map((line) => {
    const product = productMap.get(line.product_id);
    if (!product || !product.is_active) {
      throw new Error(`Product ${line.product_id} is unavailable.`);
    }
    if (line.quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    const options: PricedOptionLine[] = line.selected_option_ids.map(
      (optId) => {
        const opt = optionMap.get(optId);
        if (!opt || !opt.is_active) {
          throw new Error(`Option ${optId} is unavailable.`);
        }
        const group = Array.isArray(opt.product_option_groups)
          ? opt.product_option_groups[0]
          : opt.product_option_groups;
        if (group?.product_id !== line.product_id) {
          throw new Error(
            `Option ${optId} does not belong to product ${line.product_id}.`
          );
        }
        return {
          option_group_name: group?.name ?? "Option",
          option_name: opt.name,
          price_delta: Number(opt.price_delta),
        };
      }
    );

    const unit_price =
      Number(product.base_price) +
      options.reduce((sum, o) => sum + o.price_delta, 0);
    const line_total = Math.round(unit_price * line.quantity * 100) / 100;

    return {
      product_id: product.id,
      product_name: product.name,
      quantity: line.quantity,
      unit_price,
      line_total,
      options,
    };
  });

  const subtotal =
    Math.round(items.reduce((sum, i) => sum + i.line_total, 0) * 100) / 100;

  let delivery_fee = 0;
  if (input.fulfillment_type === "delivery") {
    const { data: settings } = await supabase
      .from("business_settings")
      .select("free_delivery_minimum, delivery_fee, minimum_delivery_order")
      .single();

    if (settings) {
      if (subtotal < Number(settings.minimum_delivery_order)) {
        throw new Error(
          `Minimum order for delivery is ${settings.minimum_delivery_order}.`
        );
      }
      delivery_fee =
        subtotal >= Number(settings.free_delivery_minimum)
          ? 0
          : Number(settings.delivery_fee);
    }
  }

  const total = Math.round((subtotal + delivery_fee) * 100) / 100;

  return { items, subtotal, delivery_fee, total };
}
