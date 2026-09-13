"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BusinessSettings } from "@/lib/types";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
          checked ? "bg-brand" : "bg-ink/15"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsForm({ initial }: { initial: BusinessSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <div className="px-5 pt-6 pb-10 max-w-xl flex flex-col gap-5">
      <h1 className="font-headline text-2xl font-bold text-brand-dark">Settings</h1>

      <Card className="p-4 flex flex-col gap-3">
        <h2 className="font-headline font-semibold text-ink">Business</h2>
        <input
          className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
          value={settings.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="Business name"
        />
        <input
          className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
          value={settings.contact_number ?? ""}
          onChange={(e) => set("contact_number", e.target.value)}
          placeholder="Contact number"
        />
        <input
          className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
          value={settings.business_address ?? ""}
          onChange={(e) => set("business_address", e.target.value)}
          placeholder="Business address"
        />
      </Card>

      <Card className="p-4">
        <h2 className="font-headline font-semibold text-ink mb-1">Order Settings</h2>
        <Toggle label="Accepting Orders" checked={settings.accepting_orders} onChange={(v) => set("accepting_orders", v)} />
        <Toggle label="Pickup Enabled" checked={settings.pickup_enabled} onChange={(v) => set("pickup_enabled", v)} />
        <Toggle label="Delivery Enabled" checked={settings.delivery_enabled} onChange={(v) => set("delivery_enabled", v)} />
        <Toggle label="Scheduled Orders" checked={settings.scheduled_orders_enabled} onChange={(v) => set("scheduled_orders_enabled", v)} />
      </Card>

      <Card className="p-4">
        <h2 className="font-headline font-semibold text-ink mb-1">Payment Methods</h2>
        <Toggle label="Cash" checked={settings.cash_enabled} onChange={(v) => set("cash_enabled", v)} />
        <Toggle label="GCash" checked={settings.gcash_enabled} onChange={(v) => set("gcash_enabled", v)} />
        <Toggle label="Credit/Debit Card" checked={settings.card_enabled} onChange={(v) => set("card_enabled", v)} />
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <h2 className="font-headline font-semibold text-ink">Delivery</h2>
        <label className="text-xs text-ink-muted">
          Free delivery minimum (₱)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={settings.free_delivery_minimum}
            onChange={(e) => set("free_delivery_minimum", Number(e.target.value))}
          />
        </label>
        <label className="text-xs text-ink-muted">
          Delivery fee (₱)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={settings.delivery_fee}
            onChange={(e) => set("delivery_fee", Number(e.target.value))}
          />
        </label>
        <label className="text-xs text-ink-muted">
          Minimum delivery order (₱)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={settings.minimum_delivery_order}
            onChange={(e) => set("minimum_delivery_order", Number(e.target.value))}
          />
        </label>
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <h2 className="font-headline font-semibold text-ink">Timing</h2>
        <label className="text-xs text-ink-muted">
          Estimated pickup time (minutes)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={settings.estimated_pickup_minutes}
            onChange={(e) => set("estimated_pickup_minutes", Number(e.target.value))}
          />
        </label>
        <label className="text-xs text-ink-muted">
          Estimated delivery time (minutes)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
            value={settings.estimated_delivery_minutes}
            onChange={(e) => set("estimated_delivery_minutes", Number(e.target.value))}
          />
        </label>
      </Card>

      <Button variant="primary" size="lg" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
      {savedAt && <p className="text-xs text-brand-dark text-center">Saved ✓</p>}
    </div>
  );
}
