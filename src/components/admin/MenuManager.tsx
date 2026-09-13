"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Category, Product } from "@/lib/types";

async function patchProduct(id: string, data: Record<string, unknown>) {
  await fetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function ProductRow({
  product,
  onChange,
}: {
  product: Product;
  onChange: (id: string, patch: Partial<Product>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    base_price: product.base_price,
    image_url: product.image_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function toggle(field: "is_bestseller" | "is_active" | "is_featured" | "is_must_try") {
    const next = !product[field];
    onChange(product.id, { [field]: next });
    await patchProduct(product.id, { [field]: next });
  }

  async function saveDetails() {
    setSaving(true);
    await patchProduct(product.id, {
      name: form.name,
      description: form.description || null,
      base_price: Number(form.base_price),
      image_url: form.image_url || null,
    });
    onChange(product.id, {
      name: form.name,
      description: form.description,
      base_price: Number(form.base_price),
      image_url: form.image_url || null,
    });
    setSaving(false);
    setExpanded(false);
  }

  return (
    <Card className={`p-3 ${!product.is_active ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-brand-light">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-brand/40 text-lg">☕</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink text-sm truncate">{product.name}</p>
            {product.is_bestseller && <Badge tone="bestseller">🔥</Badge>}
          </div>
          <p className="text-xs text-ink-muted">₱{product.base_price.toFixed(0)}</p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-ink-muted p-1"
          aria-label="Edit product"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => toggle("is_bestseller")}
          className={`text-xs rounded-full px-3 py-1.5 font-medium ${
            product.is_bestseller ? "bg-clay/15 text-clay" : "bg-ink/5 text-ink-muted"
          }`}
        >
          🔥 Bestseller
        </button>
        <button
          onClick={() => toggle("is_must_try")}
          className={`text-xs rounded-full px-3 py-1.5 font-medium ${
            product.is_must_try ? "bg-brand text-cream" : "bg-ink/5 text-ink-muted"
          }`}
        >
          ✨ Must Try
        </button>
        <button
          onClick={() => toggle("is_featured")}
          className={`text-xs rounded-full px-3 py-1.5 font-medium ${
            product.is_featured ? "bg-brand-light text-brand-dark" : "bg-ink/5 text-ink-muted"
          }`}
        >
          Featured
        </button>
        <button
          onClick={() => toggle("is_active")}
          className={`text-xs rounded-full px-3 py-1.5 font-medium ml-auto ${
            product.is_active ? "bg-brand text-cream" : "bg-ink/10 text-ink-muted"
          }`}
        >
          {product.is_active ? "Active" : "Disabled"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-ink/10 flex flex-col gap-2">
          <input
            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Product name"
          />
          <textarea
            className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            rows={2}
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step={1}
              className="rounded-lg border border-ink/10 px-3 py-2 text-sm w-28"
              value={form.base_price}
              onChange={(e) => setForm((f) => ({ ...f, base_price: Number(e.target.value) }))}
              placeholder="Price"
            />
            <input
              className="rounded-lg border border-ink/10 px-3 py-2 text-sm flex-1"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="Image URL (/images/products/…)"
            />
          </div>
          <Button variant="primary" onClick={saveDetails} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function AddProductForm({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: (product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !price || !categoryId) {
      setError("Name, price, and category are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: categoryId,
        name: name.trim(),
        base_price: Number(price),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add product.");
      return;
    }
    onCreated({
      id: data.id,
      category_id: categoryId,
      sku: null,
      name: name.trim(),
      description: null,
      base_price: Number(price),
      image_url: null,
      is_active: true,
      is_bestseller: false,
      is_featured: false,
      is_must_try: false,
      is_sample_data: false,
      sort_order: 0,
    });
    setName("");
    setPrice("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        <Plus size={16} /> Add Product
      </Button>
    );
  }

  return (
    <Card className="p-4 flex flex-col gap-2">
      <input
        className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          type="number"
          className="rounded-lg border border-ink/10 px-3 py-2 text-sm w-28"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select
          className="rounded-lg border border-ink/10 px-3 py-2 text-sm flex-1"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" onClick={handleAdd} disabled={saving} className="flex-1">
          {saving ? "Adding…" : "Add"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

export function MenuManager({
  categories,
  products: initialProducts,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);

  function handleChange(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function handleCreated(product: Product) {
    setProducts((prev) => [...prev, product]);
  }

  return (
    <div className="px-5 pt-6 pb-10 max-w-2xl">
      <h1 className="font-headline text-2xl font-bold text-brand-dark mb-1">Menu</h1>
      <p className="text-sm text-ink-muted mb-5">
        Changes here go live on the customer menu immediately.
      </p>

      {categories.map((cat) => (
        <div key={cat.id} className="mb-8">
          <h2 className="font-headline font-semibold text-ink mb-3">{cat.name}</h2>
          <div className="flex flex-col gap-3">
            {products
              .filter((p) => p.category_id === cat.id)
              .map((p) => (
                <ProductRow key={p.id} product={p} onChange={handleChange} />
              ))}
          </div>
        </div>
      ))}

      <AddProductForm categories={categories} onCreated={handleCreated} />
    </div>
  );
}
