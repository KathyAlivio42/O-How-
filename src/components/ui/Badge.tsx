import type { ReactNode } from "react";
import clsx from "clsx";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "bestseller" | "neutral" | "brand";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "bestseller" && "bg-clay/15 text-clay",
        tone === "brand" && "bg-brand-light text-brand-dark",
        tone === "neutral" && "bg-ink/5 text-ink-muted"
      )}
    >
      {children}
    </span>
  );
}
