"use client";
import { useEffect, useRef, useState } from "react";
import type { VarGroup } from "./nodeOutputs/collectUpstreamVars";
import { isComplexType } from "./nodeOutputs/registry";

// ── Variable picker button + popover ──────────────────────────────────────────
//
// A "{ }" button (top-right of a text field) that opens a popover listing
// variables from upstream nodes, grouped by source node. Clicking a row calls
// onInsert(key) — the parent inserts {{key}} at the textarea cursor (reuses the
// existing cursor-aware insertVar in NodeInspectorPanel). No new UI deps.
//
// Brand colours: sidebar #2B0D3E · primary #7A3F91 · hover #C59DD9 · bg #F2EAF7.

export default function VarPickerButton({
  groups,
  readOnly,
  onInsert,
}: {
  groups:   VarGroup[];
  readOnly: boolean;
  onInsert: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasVars = groups.some((g) => g.vars.length > 0);
  if (!hasVars) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setOpen((o) => !o)}
        title="Insert a variable"
        aria-label="Insert a variable"
        className="rounded-md border border-[#7A3F91]/30 bg-[#F2EAF7] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#7A3F91] transition hover:bg-[#C59DD9]/30 disabled:opacity-40"
      >
        {"{ }"}
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-lg border border-[#7A3F91]/20 bg-white shadow-xl"
          role="menu"
        >
          {groups.map((group) =>
            group.vars.length === 0 ? null : (
              <div key={group.sourceId || "system"}>
                <div className="sticky top-0 bg-[#2B0D3E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
                  {group.sourceLabel}
                </div>
                {group.vars.map((v) => {
                  const complex = isComplexType(v.type);
                  return (
                    <button
                      key={`${group.sourceId}:${v.key}`}
                      type="button"
                      role="menuitem"
                      onClick={() => { onInsert(v.key); setOpen(false); }}
                      className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] text-gray-700 transition hover:bg-[#F2EAF7]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{v.label}</span>
                        <span className="block truncate font-mono text-[10px] text-[#7A3F91]">{`{{${v.key}}}`}</span>
                      </span>
                      {complex && (
                        <span
                          className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-700"
                          title="Array/object — not usable raw in text"
                        >
                          {v.type}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
