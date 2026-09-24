"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, ChevronLeft } from "lucide-react";
import { ProductTag } from "@/components/customer/ProductTag";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart-context";
import type { Product, CartItemSelectedOption } from "@/lib/types";

export function ProductCustomizer({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // selections: option_group_id -> Set of option_ids
  const [selections, setSelections] = useState<Record<string, Set<string>>>(
    () => {
      const initial: Record<string, Set<string>> = {};
      product.option_groups?.forEach((group) => {
        const defaults = group.options
          .filter((o) => o.is_default && o.is_active)
          .map((o) => o.id);
        initial[group.id] = new Set(defaults);
      });
      return initial;
    }
  );

  function toggleOption(groupId: string, optionId: string, allowMultiple: boolean) {
    setSelections((prev) => {
      const next = { ...prev };
      const current = new Set(next[groupId] ?? []);
      if (allowMultiple) {
        current.has(optionId) ? current.delete(optionId) : current.add(optionId);
      } else {
        current.clear();
        current.add(optionId);
      }
      next[groupId] = current;
      return next;
    });
  }

  const selectedOptionsFlat: CartItemSelectedOption[] = useMemo(() => {
    const flat: CartItemSelectedOption[] = [];
    product.option_groups?.forEach((group) => {
      const chosenIds = selections[group.id] ?? new Set();
      group.options.forEach((opt) => {
        if (chosenIds.has(opt.id)) {
          flat.push({
            option_group_id: group.id,
            option_group_name: group.name,
            option_id: opt.id,
            option_name: opt.name,
            price_delta: Number(opt.price_delta),
          });
        }
      });
    });
    return flat;
  }, [selections, product.option_groups]);

  const unitPrice =
    product.base_price + selectedOptionsFlat.reduce((s, o) => s + o.price_delta, 0);
  const total = unitPrice * quantity;

  const missingRequired = (product.option_groups ?? []).some(
    (g) => g.is_required && (selections[g.id]?.size ?? 0) === 0
  );

  function handleAdd() {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image_url: product.image_url,
      base_price: product.base_price,
      quantity,
      selected_options: selectedOptionsFlat,
    });
    setJustAdded(true);
    setTimeout(() => router.push("/menu"), 700);
  }

  return (
    <main className="max-w-md mx-auto pb-32">
      <div className="relative h-72 bg-brand-light">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-brand/40 text-6xl">☕</div>
        )}
        <button
          onClick={() => router.back()}
          aria-label="Back to menu"
          className="absolute left-4 top-4 rounded-full bg-white/90 p-2 shadow-card"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="px-5 pt-5">
        <ProductTag product={product} />
        <h1 className="font-headline text-2xl font-bold text-ink mt-2">{product.name}</h1>
        {product.description && (
          <p className="text-ink-muted mt-1">{product.description}</p>
        )}
        <p className="font-semibold text-brand-dark text-lg mt-2">
          {product.base_price.toFixed(0)}
        </p>
      </div>

      {product.option_groups?.map((group) => {
        const activeOptions = group.options.filter((o) => o.is_active);
        const selectedId = [...(selections[group.id] ?? [])][0] ?? "";

        return (
          <div key={group.id} className="px-5 mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-headline font-semibold text-ink">{group.name}</h2>
              {group.is_required && (
                <span className="text-xs text-clay">Required</span>
              )}
            </div>

            {activeOptions.length === 0 ? (
              <p className="text-sm text-ink-muted mt-2">Currently unavailable.</p>
            ) : group.allow_multiple ? (
              // Multi-select groups (e.g. Add-ons) stay as toggleable pills --
              // a dropdown can't represent "choose any number of these."
              <div className="mt-2 flex flex-wrap gap-2">
                {activeOptions.map((option) => {
                  const checked = selections[group.id]?.has(option.id) ?? false;
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(group.id, option.id, true)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        checked
                          ? "bg-brand text-cream border-brand"
                          : "bg-white text-ink border-ink/10"
                      }`}
                    >
                      {option.name}
                      {option.price_delta > 0 && ` +${option.price_delta.toFixed(0)}`}
                    </button>
                  );
                })}
              </div>
            ) : (
              // Single-select groups (Size, Sugar Level, Ice) use a dropdown.
              <select
                value={selectedId}
                onChange={(e) => toggleOption(group.id, e.target.value, false)}
                className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink"
              >
                {!selectedId && (
                  <option value="" disabled>
                    Choose {group.name.toLowerCase()}…
                  </option>
                )}
                {activeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.price_delta > 0 ? ` (+${option.price_delta.toFixed(0)})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}

      <div className="fixed bottom-0 left-0 right-0 bg-cream border-t border-ink/10 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white rounded-full border border-ink/10 px-3 py-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-5 text-center font-medium">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
              <Plus size={16} />
            </button>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={missingRequired}
            onClick={handleAdd}
          >
            {justAdded ? "Added ✓" : `Add to Cart · ${total.toFixed(0)}`}
          </Button>
        </div>
      </div>
    </main>
  );
}
