"use client";

import { useToastStore } from "@/store/toastStore";

const ICONS: Record<string, string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

const COLORS: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error:   "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info:    "bg-[#F2EAF7] border-[#C9A8E0] text-[#2B0D3E]",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm ${COLORS[t.type]}`}
        >
          <span className="mt-0.5 shrink-0 font-bold">{ICONS[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="shrink-0 text-base leading-none opacity-50 hover:opacity-100 transition"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
