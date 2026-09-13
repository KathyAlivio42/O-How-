"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ProductTag } from "@/components/customer/ProductTag";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";

const ITEM_WIDTH = 76; // px, includes gap
const MAX_ANGLE_DEG = 38; // how far items swing along the arc at the edges
const ARC_HEIGHT = 26; // px, how much off-center items lift/drop

export function RadialBottomSheet({
  products,
  initialProductId,
  onClose,
}: {
  products: Product[];
  initialProductId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const initialIndex = Math.max(
    0,
    products.findIndex((p) => p.id === initialProductId)
  );

  // Center the initially-selected (or first) item on mount.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    el.scrollLeft = initialIndex * ITEM_WIDTH;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
  }

  const selectedIndex = useMemo(() => {
    if (containerWidth === 0) return initialIndex;
    const center = scrollLeft + containerWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    products.forEach((_, i) => {
      const itemCenter = i * ITEM_WIDTH + ITEM_WIDTH / 2;
      const dist = Math.abs(itemCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    return closest;
  }, [scrollLeft, containerWidth, products, initialIndex]);

  const selected = products[selectedIndex] ?? products[0];

  function scrollToIndex(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * ITEM_WIDTH, behavior: "smooth" });
  }

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close menu browser"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      {/* Sheet */}
      <div className="relative bg-cream rounded-t-3xl shadow-card-hover pb-6 animate-[slideUp_0.25s_ease-out]">
        <style>{`@keyframes slideUp { from { transform: translateY(100%);} to { transform: translateY(0);} }`}</style>

        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-ink/15" />
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-white/80 p-1.5 text-ink-muted"
        >
          <X size={18} />
        </button>

        {/* Always-readable preview area */}
        <div className="px-6 pt-4 flex gap-4 items-center">
          <div className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden bg-brand-light shadow-card">
            {selected.image_url ? (
              <Image
                src={selected.image_url}
                alt={selected.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-brand/40 text-3xl">
                ☕
              </div>
            )}
          </div>
          <div className="min-w-0">
            <ProductTag product={selected} />
            <h3 className="font-headline font-bold text-lg text-ink mt-1 truncate">
              {selected.name}
            </h3>
            <p className="text-sm text-ink-muted line-clamp-2">
              {selected.description}
            </p>
            <p className="font-semibold text-brand-dark mt-1">
              ₱{selected.base_price.toFixed(0)}
            </p>
          </div>
        </div>

        <div className="px-6 mt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push(`/product/${selected.id}`)}
          >
            Customize & Add
          </Button>
        </div>

        {/* Thumb-friendly rotating wheel */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="mt-5 flex overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
          style={{
            paddingLeft: containerWidth ? containerWidth / 2 - ITEM_WIDTH / 2 : 0,
            paddingRight: containerWidth ? containerWidth / 2 - ITEM_WIDTH / 2 : 0,
          }}
        >
          {products.map((p, i) => {
            const itemCenter = i * ITEM_WIDTH + ITEM_WIDTH / 2;
            const center = scrollLeft + containerWidth / 2;
            const distancePx = itemCenter - center;
            const maxDistance = ITEM_WIDTH * 3;
            const t = Math.max(-1, Math.min(1, distancePx / maxDistance));
            const angle = t * MAX_ANGLE_DEG;
            const lift = Math.cos((angle * Math.PI) / 180) * ARC_HEIGHT - ARC_HEIGHT;
            const scale = 1 - Math.abs(t) * 0.28;
            const opacity = 1 - Math.abs(t) * 0.55;

            return (
              <button
                key={p.id}
                onClick={() => scrollToIndex(i)}
                className="shrink-0 snap-center flex flex-col items-center gap-1"
                style={{
                  width: ITEM_WIDTH,
                  transform: `translateY(${-lift}px) scale(${scale})`,
                  opacity,
                }}
              >
                <div
                  className={`relative h-14 w-14 rounded-full overflow-hidden border-2 ${
                    i === selectedIndex ? "border-brand" : "border-transparent"
                  } bg-brand-light shadow-card`}
                >
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-brand/40 text-lg">
                      ☕
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-ink-muted truncate w-full text-center">
                  {p.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
