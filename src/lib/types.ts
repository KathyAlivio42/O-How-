// Shared types mirroring supabase/migrations/0001_init.sql
// Kept hand-written and minimal for MVP; swap for `supabase gen types typescript`
// output once the project is linked, if you want full type generation.

export type FulfillmentType = "pickup" | "delivery";
export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";
export type PaymentMethod = "cash" | "gcash" | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface BusinessSettings {
  business_name: string;
  logo_url: string | null;
  primary_color: string;
  gcash_qr_url: string | null;
  contact_number: string | null;
  business_address: string | null;
  business_hours: Record<string, { open: string; close: string }>;
  accepting_orders: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  scheduled_orders_enabled: boolean;
  cash_enabled: boolean;
  gcash_enabled: boolean;
  card_enabled: boolean;
  free_delivery_minimum: number;
  delivery_fee: number;
  minimum_delivery_order: number;
  estimated_pickup_minutes: number;
  estimated_delivery_minutes: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductOption {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  sort_order: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  category_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  is_must_try: boolean;
  is_sample_data: boolean;
  sort_order: number;
  option_groups?: ProductOptionGroup[];
}

// ---- Cart (client-side only, never trusted for pricing) ----

export interface CartItemSelectedOption {
  option_group_id: string;
  option_group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
}

export interface CartItem {
  cart_item_id: string; // client-generated, for React keys / editing
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  base_price: number;
  quantity: number;
  selected_options: CartItemSelectedOption[];
}

// ---- Order creation payload (client -> server) ----
// Deliberately excludes any price field — the server recomputes everything.

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  selected_option_ids: string[];
}

export interface CreateOrderInput {
  fulfillment_type: FulfillmentType;
  customer_name: string;
  customer_mobile: string;
  pickup_time_type?: "asap" | "scheduled";
  scheduled_pickup_at?: string;
  delivery_address?: string;
  delivery_landmark?: string;
  delivery_instructions?: string;
  payment_method: PaymentMethod;
  items: CreateOrderItemInput[];
  notes?: string;
}

export interface OrderConfirmation {
  order_number: number;
  tracking_token: string;
  total: number;
  estimated_minutes: number;
}
