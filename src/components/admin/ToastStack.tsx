"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 max-w-xs">
      {toasts.map((t) => (
        <Toast key={t.id} text={t.text} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={onDismiss}
      className="flex items-start gap-2 rounded-xl bg-ink text-cream px-4 py-3 shadow-card-hover text-left animate-[toast-in_0.25s_ease-out]"
    >
      <style>{`@keyframes toast-in { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <Bell size={16} className="shrink-0 mt-0.5" />
      <span className="text-sm">{text}</span>
    </button>
  );
}
