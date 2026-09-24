"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface OptionRow {
  id: string;
  name: string;
  price_delta: number;
  is_active: boolean;
  is_default: boolean;
}

interface GroupRow {
  id: string;
  name: string;
  is_required: boolean;
  allow_multiple: boolean;
  options: OptionRow[];
}

async function patchOption(id: string, data: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/options/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return null;
    if (res.status === 401) return "Signed out";
    const body = await res.json().catch(() => null);
    return body?.error ?? `Failed (${res.status})`;
  } catch {
    return "Network error";
  }
}

function OptionRowEditor({
  option,
  onUpdated,
}: {
  option: OptionRow;
  onUpdated: (patch: Partial<OptionRow>) => void;
}) {
  const [price, setPrice] = useState(String(option.price_delta));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function savePrice() {
    const parsed = Number(price);
    if (Number.isNaN(parsed) || parsed < 0 || parsed === option.price_delta) {
      setPrice(String(option.price_delta)); // reset to last known-good value
      return;
    }
    setStatus("saving");
    const err = await patchOption(option.id, { price_delta: parsed });
    if (!err) {
      onUpdated({ price_delta: parsed });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setPrice(String(option.price_delta)); // roll back the input on failure
      setErrorMessage(err);
      setStatus("error");
    }
  }

  async function toggleActive() {
    const next = !option.is_active;
    const err = await patchOption(option.id, { is_active: next });
    if (!err) {
      onUpdated({ is_active: next });
    } else {
      setErrorMessage(err);
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <button
        onClick={toggleActive}
        className={`text-xs rounded-full px-2.5 py-1 font-medium shrink-0 ${
          option.is_active ? "bg-brand text-cream" : "bg-ink/10 text-ink-muted"
        }`}
      >
        {option.is_active ? "Available" : "Unavailable"}
      </button>
      <span className={`text-sm flex-1 truncate ${!option.is_active ? "text-ink-muted line-through" : "text-ink"}`}>
        {option.name}
        {option.is_default && <span className="text-xs text-ink-muted ml-1">(default)</span>}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-ink-muted">+</span>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={savePrice}
          className="w-16 rounded-lg border border-ink/10 px-2 py-1 text-sm text-right"
        />
      </div>
      {status === "saving" && <span className="text-xs text-ink-muted shrink-0">Saving…</span>}
      {status === "saved" && <span className="text-xs text-brand-dark shrink-0">Saved ✓</span>}
      {status === "error" && (
        <span className="text-xs text-red-600 shrink-0">{errorMessage ?? "Failed"}</span>
      )}
    </div>
  );
}

async function createOption(
  optionGroupId: string,
  name: string,
  priceDelta: number
): Promise<{ id: string; sort_order: number } | { error: string }> {
  try {
    const res = await fetch("/api/admin/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_group_id: optionGroupId, name, price_delta: priceDelta }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.id) return { id: body.id, sort_order: body.sort_order };
    if (res.status === 401) return { error: "Signed out" };
    return { error: body?.error ?? `Failed (${res.status})` };
  } catch {
    return { error: "Network error" };
  }
}

function AddOptionForm({
  groupId,
  onAdded,
}: {
  groupId: string;
  onAdded: (option: OptionRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim()) {
      setError("Enter a name for this option.");
      return;
    }
    const parsedPrice = Number(price) || 0;
    setSaving(true);
    setError(null);
    const result = await createOption(groupId, name.trim(), parsedPrice);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onAdded({
      id: result.id,
      name: name.trim(),
      price_delta: parsedPrice,
      is_active: true,
      is_default: false,
    });
    setName("");
    setPrice("0");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-brand-dark font-medium mt-1.5"
      >
        + Add option
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Extra Large (32oz)"
        className="flex-1 rounded-lg border border-ink/10 px-2 py-1.5 text-sm"
      />
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-ink-muted">+</span>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-14 rounded-lg border border-ink/10 px-2 py-1.5 text-sm text-right"
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={saving}
        className="text-xs rounded-lg bg-brand text-cream px-2.5 py-1.5 font-medium shrink-0"
      >
        {saving ? "…" : "Add"}
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-xs text-ink-muted shrink-0"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600 basis-full">{error}</p>}
    </div>
  );
}

export function ProductOptionsEditor({ productId }: { productId: string }) {
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("product_option_groups")
      .select(
        "id, name, is_required, allow_multiple, sort_order, options:product_options(id, name, price_delta, is_active, is_default, sort_order)"
      )
      .eq("product_id", productId)
      .order("sort_order")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError(true);
          return;
        }
        setGroups(
          (data as unknown as GroupRow[]).map((g) => ({
            ...g,
            options: [...g.options].sort((a: any, b: any) => a.sort_order - b.sort_order),
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function updateOption(groupId: string, optionId: string, patch: Partial<OptionRow>) {
    setGroups((prev) =>
      prev
        ? prev.map((g) =>
            g.id !== groupId
              ? g
              : {
                  ...g,
                  options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
                }
          )
        : prev
    );
  }

  function addOption(groupId: string, option: OptionRow) {
    setGroups((prev) =>
      prev
        ? prev.map((g) => (g.id !== groupId ? g : { ...g, options: [...g.options, option] }))
        : prev
    );
  }

  if (loadError) {
    return <p className="text-xs text-red-600 mt-3">Could not load customization options.</p>;
  }

  if (!groups) {
    return <p className="text-xs text-ink-muted mt-3">Loading options…</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-xs text-ink-muted mt-3">
        This product has no size/customization options set up yet.
      </p>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink/10 flex flex-col gap-4">
      <p className="text-xs text-ink-muted -mb-2">
        Toggle Available/Unavailable to control what customers can pick, and edit the upcharge
        for each option. Changes apply immediately.
      </p>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-xs font-semibold text-ink uppercase tracking-wide">
            {group.name}
            {group.is_required && <span className="text-clay ml-1 normal-case">(required)</span>}
          </p>
          <div className="divide-y divide-ink/5">
            {group.options.map((option) => (
              <OptionRowEditor
                key={option.id}
                option={option}
                onUpdated={(patch) => updateOption(group.id, option.id, patch)}
              />
            ))}
          </div>
          <AddOptionForm groupId={group.id} onAdded={(option) => addOption(group.id, option)} />
        </div>
      ))}
    </div>
  );
}
