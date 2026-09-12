export function DeliveryProgress({
  subtotal,
  freeDeliveryMinimum,
}: {
  subtotal: number;
  freeDeliveryMinimum: number;
}) {
  if (subtotal >= freeDeliveryMinimum) {
    return (
      <div className="rounded-2xl bg-brand-light px-4 py-3 text-sm text-brand-dark font-medium">
        🎉 You unlocked FREE DELIVERY!
      </div>
    );
  }

  const remaining = freeDeliveryMinimum - subtotal;
  const progress = Math.min(100, (subtotal / freeDeliveryMinimum) * 100);

  return (
    <div className="rounded-2xl bg-white border border-ink/10 px-4 py-3">
      <p className="text-sm text-ink">
        Add <span className="font-semibold text-brand-dark">₱{remaining.toFixed(0)}</span> more
        for FREE DELIVERY.
      </p>
      <div className="mt-2 h-2 rounded-full bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        ₱{subtotal.toFixed(0)} / ₱{freeDeliveryMinimum.toFixed(0)}
      </p>
    </div>
  );
}
