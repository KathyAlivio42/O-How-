"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BusinessSettings, PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, fulfillmentType, subtotalEstimate, clearCart } = useCart();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pickupTimeType, setPickupTimeType] = useState<"asap" | "scheduled">("asap");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [instructions, setInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("business_settings")
      .select(
        "business_name, logo_url, primary_color, contact_number, business_address, business_hours, accepting_orders, pickup_enabled, delivery_enabled, scheduled_orders_enabled, cash_enabled, gcash_enabled, card_enabled, free_delivery_minimum, delivery_fee, minimum_delivery_order, estimated_pickup_minutes, estimated_delivery_minutes"
      )
      .single()
      .then(({ data }) => setSettings(data as BusinessSettings));
  }, []);

  if (items.length === 0) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-ink-muted">Your cart is empty.</p>
        <Link href="/menu" className="inline-block mt-4">
          <Button variant="primary">Browse the Menu</Button>
        </Link>
      </main>
    );
  }

  const deliveryFee =
    fulfillmentType === "delivery" && settings
      ? subtotalEstimate >= settings.free_delivery_minimum
        ? 0
        : settings.delivery_fee
      : 0;
  const total = subtotalEstimate + deliveryFee;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !mobile.trim()) {
      setError("Please enter your name and mobile number.");
      return;
    }
    if (fulfillmentType === "delivery" && !address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment_type: fulfillmentType ?? "pickup",
          customer_name: name.trim(),
          customer_mobile: mobile.trim(),
          pickup_time_type: fulfillmentType === "pickup" ? pickupTimeType : undefined,
          delivery_address: fulfillmentType === "delivery" ? address.trim() : undefined,
          delivery_landmark: fulfillmentType === "delivery" ? landmark.trim() : undefined,
          delivery_instructions:
            fulfillmentType === "delivery" ? instructions.trim() : undefined,
          payment_method: paymentMethod,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            selected_option_ids: i.selected_options.map((o) => o.option_id),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Your order could not be submitted. Please try again.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/confirmation/${data.order_number}?token=${data.tracking_token}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto pb-32">
      <header className="px-4 pt-6 pb-2 flex items-center gap-3">
        <Link href="/cart" aria-label="Back to cart">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-headline text-2xl font-bold text-brand-dark">Checkout</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 flex flex-col gap-5 mt-2">
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="font-headline font-semibold text-ink">Your Details</h2>
          <input
            className="rounded-xl border border-ink/10 px-4 py-3 text-sm"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-ink/10 px-4 py-3 text-sm"
            placeholder="Mobile number"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
        </Card>

        {fulfillmentType === "pickup" && (
          <Card className="p-4 flex flex-col gap-3">
            <h2 className="font-headline font-semibold text-ink">Pickup Time</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickupTimeType("asap")}
                className={`flex-1 rounded-xl py-3 text-sm font-medium ${
                  pickupTimeType === "asap"
                    ? "bg-brand text-cream"
                    : "bg-brand-light text-brand-dark"
                }`}
              >
                ASAP
              </button>
              <button
                type="button"
                onClick={() => setPickupTimeType("scheduled")}
                disabled={!settings?.scheduled_orders_enabled}
                className={`flex-1 rounded-xl py-3 text-sm font-medium disabled:opacity-40 ${
                  pickupTimeType === "scheduled"
                    ? "bg-brand text-cream"
                    : "bg-brand-light text-brand-dark"
                }`}
              >
                Schedule
              </button>
            </div>
          </Card>
        )}

        {fulfillmentType === "delivery" && (
          <Card className="p-4 flex flex-col gap-3">
            <h2 className="font-headline font-semibold text-ink">Delivery Details</h2>
            <input
              className="rounded-xl border border-ink/10 px-4 py-3 text-sm"
              placeholder="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-ink/10 px-4 py-3 text-sm"
              placeholder="Landmark (optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
            <textarea
              className="rounded-xl border border-ink/10 px-4 py-3 text-sm"
              placeholder="Delivery instructions (optional)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
            />
          </Card>
        )}

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="font-headline font-semibold text-ink mb-1">Your Order</h2>
          {items.map((item) => {
            const optionsTotal = item.selected_options.reduce((s, o) => s + o.price_delta, 0);
            const lineTotal = (item.base_price + optionsTotal) * item.quantity;
            return (
              <div key={item.cart_item_id} className="flex justify-between text-sm">
                <span className="text-ink">
                  {item.product_name} × {item.quantity}
                </span>
                <span className="text-ink-muted">₱{lineTotal.toFixed(0)}</span>
              </div>
            );
          })}
          <div className="border-t border-ink/10 mt-2 pt-2 flex flex-col gap-1">
            <div className="flex justify-between text-sm text-ink-muted">
              <span>Subtotal</span>
              <span>₱{subtotalEstimate.toFixed(0)}</span>
            </div>
            {fulfillmentType === "delivery" && (
              <div className="flex justify-between text-sm text-ink-muted">
                <span>Delivery</span>
                <span>{deliveryFee === 0 ? "FREE" : `₱${deliveryFee.toFixed(0)}`}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-ink mt-1">
              <span>Total</span>
              <span>₱{total.toFixed(0)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="font-headline font-semibold text-ink mb-1">Payment Method</h2>
          {(
            [
              ["cash", "Cash", settings?.cash_enabled],
              ["gcash", "GCash", settings?.gcash_enabled],
              ["card", "Credit/Debit Card", settings?.card_enabled],
            ] as [PaymentMethod, string, boolean | undefined][]
          )
            .filter(([, , enabled]) => enabled !== false)
            .map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={`rounded-xl px-4 py-3 text-sm font-medium text-left ${
                  paymentMethod === value
                    ? "bg-brand text-cream"
                    : "bg-brand-light text-brand-dark"
                }`}
              >
                {label}
              </button>
            ))}
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={submitting}>
          {submitting ? "Placing Order…" : `Place Order · ₱${total.toFixed(0)}`}
        </Button>
      </form>
    </main>
  );
}
