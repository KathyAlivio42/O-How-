"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Search, X } from "lucide-react";
import { ProductCard } from "@/components/customer/ProductCard";
import { FeaturedBestsellers } from "@/components/customer/FeaturedBestsellers";
import { StickyCartBar } from "@/components/customer/StickyCartBar";
import { RadialBottomSheet } from "@/components/customer/RadialBottomSheet";
import type { Category, Product } from "@/lib/types";

export function MenuClient({
  categories,
  products,
  isAdmin = false,
}: {
  categories: Category[];
  products: Product[];
  isAdmin?: boolean;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const categoryProducts = products.filter(
    (p) => p.category_id === activeCategoryId
  );

  const featured = categoryProducts.filter((p) => p.is_featured).slice(0, 2);
  const featuredIds = new Set(featured.map((p) => p.id));
  const remaining = categoryProducts.filter((p) => !featuredIds.has(p.id));

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [query, products]);

  return (
    <main className="max-w-md mx-auto pb-28">
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-headline text-2xl font-bold text-brand-dark">
          Menu
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-white border border-ink/10 text-ink shadow-card"
            aria-label="Search menu"
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white border border-ink/10 px-3 py-2 text-sm text-ink shadow-card"
            aria-label="Browse menu with quick picker"
          >
            <LayoutGrid size={16} />
            Browse
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="px-4 pb-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drinks…"
            className="w-full rounded-full border border-ink/10 px-4 py-2.5 text-sm bg-white"
          />
        </div>
      )}

      {searchResults ? (
        <div className="px-4 grid grid-cols-2 gap-3 mt-2">
          {searchResults.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {searchResults.length === 0 && (
            <p className="col-span-2 text-center text-ink-muted text-sm py-10">
              No drinks match "{query}".
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Category tabs */}
          <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategoryId === cat.id
                    ? "bg-brand text-cream"
                    : "bg-white text-ink-muted border border-ink/10"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <FeaturedBestsellers products={featured} isAdmin={isAdmin} />

          {/* Product grid */}
          <div className="px-4 grid grid-cols-2 gap-3 mt-2">
            {remaining.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {categoryProducts.length === 0 && (
              <p className="col-span-2 text-center text-ink-muted text-sm py-10">
                No items in this category yet.
              </p>
            )}
          </div>
        </>
      )}

      <StickyCartBar />

      {sheetOpen && (
        <RadialBottomSheet
          products={categoryProducts}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </main>
  );
}
