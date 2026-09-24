"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/lib/types";

async function readError(res: Response): Promise<string> {
  if (res.status === 401) return "You've been signed out -- please sign in again.";
  const body = await res.json().catch(() => null);
  return body?.error ? `${body.error} (${res.status})` : `Save failed (HTTP ${res.status}).`;
}

export function CategoriesManager({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  async function toggleActive(cat: Category) {
    setRowError((prev) => ({ ...prev, [cat.id]: "" }));
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
        );
      } else {
        const message = await readError(res);
        setRowError((prev) => ({ ...prev, [cat.id]: message }));
      }
    } catch {
      setRowError((prev) => ({
        ...prev,
        [cat.id]: "Network error -- the request never reached the server.",
      }));
    }
  }

  async function rename(cat: Category, name: string) {
    setRowError((prev) => ({ ...prev, [cat.id]: "" }));
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name } : c)));
      } else {
        const message = await readError(res);
        setRowError((prev) => ({ ...prev, [cat.id]: message }));
      }
    } catch {
      setRowError((prev) => ({
        ...prev,
        [cat.id]: "Network error -- the request never reached the server.",
      }));
    }
  }

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), sort_order: categories.length + 1 }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setCategories((prev) => [
          ...prev,
          {
            id: data.id,
            name: newName.trim(),
            description: null,
            image_url: null,
            sort_order: prev.length + 1,
            is_active: true,
          },
        ]);
        setNewName("");
      } else {
        setAddError(await readError(res));
      }
    } catch {
      setAddError("Network error -- the request never reached the server.");
    }
    setSaving(false);
  }

  return (
    <div className="px-5 pt-6 pb-10 max-w-xl">
      <h1 className="font-headline text-2xl font-bold text-brand-dark mb-5">Categories</h1>
      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="p-3">
            <div className="flex items-center gap-3">
              <input
                className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm"
                defaultValue={cat.name}
                onBlur={(e) => e.target.value !== cat.name && rename(cat, e.target.value)}
              />
              <button
                onClick={() => toggleActive(cat)}
                className={`text-xs rounded-full px-3 py-1.5 font-medium shrink-0 ${
                  cat.is_active ? "bg-brand text-cream" : "bg-ink/10 text-ink-muted"
                }`}
              >
                {cat.is_active ? "Active" : "Disabled"}
              </button>
            </div>
            {rowError[cat.id] && (
              <p className="text-xs text-red-600 mt-1.5">{rowError[cat.id]}</p>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="primary" onClick={addCategory} disabled={saving}>
          Add
        </Button>
      </div>
      {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
    </div>
  );
}
