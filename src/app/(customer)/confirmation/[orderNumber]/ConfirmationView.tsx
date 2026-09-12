"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface OrderItem {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  line_total: number;
  order_item_options: { option_name_snapshot: string }[];
}

interface TrackedOrder {
  order_number: number;
  total: number;
  order_items: OrderItem[];
}

export function ConfirmationView() {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/track/${token}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.order ?? null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <main className="max-w-md mx-auto px-4 py-16 text-center text-ink-muted">Loading…</main>;
  }

  if (!order) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-ink-muted">We couldn't find that order confirmation.</p>
        <Link href="/menu" className="inline-block mt-4">
          <Button variant="primary">Back to Menu</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="text-6xl mb-2">🎉</div>
      <h1 className="font-headline text-2xl font-bold text-brand-dark">Order Confirmed!</h1>
      <p className="text-ink-muted mt-1">Order #{order.order_number}</p>

      <Card className="w-full mt-6 p-4 text-left">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <div>
              <span className="text-ink">
                {item.quantity} × {item.product_name_snapshot}
              </span>
              {item.order_item_options.length > 0 && (
                <p className="text-xs text-ink-muted">
                  {item.order_item_options.map((o) => o.option_name_snapshot).join(", ")}
                </p>
              )}
            </div>
            <span className="text-ink-muted">₱{item.line_total.toFixed(0)}</span>
          </div>
        ))}
        <div className="border-t border-ink/10 mt-2 pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>₱{order.total.toFixed(0)}</span>
        </div>
      </Card>

      <p className="text-sm text-ink-muted mt-4">
        Estimated preparation time: 15–20 minutes
      </p>

      {token && (
        <Link href={`/track/${token}`} className="w-full mt-6">
          <Button variant="primary" size="lg" className="w-full">
            Track My Order
          </Button>
        </Link>
      )}
    </main>
  );
}
