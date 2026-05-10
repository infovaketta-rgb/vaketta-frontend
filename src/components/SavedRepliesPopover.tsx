"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type SavedReply = {
  id:        string;
  name:      string;
  category:  string | null;
  body:      string;
  variables: string[];
};

type Props = {
  open:     boolean;
  onClose:  () => void;
  onInsert: (text: string) => void;
  /** Anchors the popover above the toolbar button */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

export default function SavedRepliesPopover({ open, onClose, onInsert, anchorRef }: Props) {
  const [replies,   setReplies]   = useState<SavedReply[]>([]);
  const [search,    setSearch]    = useState("");
  const [category,  setCategory]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [varFill,   setVarFill]   = useState<{ reply: SavedReply; values: Record<string, string> } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load replies on open
  useEffect(() => {
    if (!open) { setSearch(""); setCategory(null); setVarFill(null); return; }
    setLoading(true);
    apiFetch("/saved-replies")
      .then(setReplies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current  && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const categories = [...new Set(replies.map((r) => r.category).filter(Boolean))] as string[];

  const filtered = replies.filter((r) => {
    if (category && r.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.body.toLowerCase().includes(q);
    }
    return true;
  });

  function pick(reply: SavedReply) {
    if (reply.variables.length === 0) {
      onInsert(reply.body);
      onClose();
    } else {
      setVarFill({ reply, values: Object.fromEntries(reply.variables.map((v) => [v, ""])) });
    }
  }

  function applyVarFill() {
    if (!varFill) return;
    let text = varFill.reply.body;
    for (const [k, v] of Object.entries(varFill.values)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
    onInsert(text);
    onClose();
  }

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-white rounded-2xl shadow-xl border border-[#E5E0D4] overflow-hidden flex flex-col"
      style={{ maxHeight: "360px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-[#E5E0D4] shrink-0">
        <span className="text-[13px] font-semibold text-[#0C1B33]">Saved Replies</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
      </div>

      {varFill ? (
        /* Variable fill modal */
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          <p className="text-[12px] font-semibold text-[#0C1B33]">{varFill.reply.name}</p>
          <div className="rounded-lg bg-[#F4F2ED] p-2 text-[11px] text-slate-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
            {varFill.reply.body}
          </div>
          {varFill.reply.variables.map((v) => (
            <div key={v}>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                <code className="text-purple-600">{`{{${v}}}`}</code>
              </label>
              <input
                type="text"
                placeholder={`Value for ${v}`}
                value={varFill.values[v] ?? ""}
                onChange={(e) => setVarFill((f) => f ? { ...f, values: { ...f.values, [v]: e.target.value } } : f)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-[#1B52A8] focus:ring-1 focus:ring-[#1B52A8]/20"
                autoFocus
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setVarFill(null)}
              className="flex-1 py-1.5 rounded-lg border border-gray-200 text-[12px] text-slate-600 hover:bg-slate-50 transition"
            >Back</button>
            <button
              onClick={applyVarFill}
              className="flex-1 py-1.5 rounded-lg bg-[#1B52A8] text-white text-[12px] font-medium hover:bg-[#1640881] transition"
            >Insert</button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-3 py-2 border-b border-[#E5E0D4] shrink-0">
            <input
              type="text"
              autoFocus
              placeholder="Search replies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1B52A8] focus:ring-1 focus:ring-[#1B52A8]/20"
            />
          </div>

          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1 px-3 py-1.5 overflow-x-auto shrink-0 border-b border-[#E5E0D4]">
              <button
                onClick={() => setCategory(null)}
                className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                  !category ? "bg-[#1B52A8] text-white" : "bg-[#F4F2ED] text-slate-600 hover:bg-slate-200"
                }`}
              >All</button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c === category ? null : c)}
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                    category === c ? "bg-[#1B52A8] text-white" : "bg-[#F4F2ED] text-slate-600 hover:bg-slate-200"
                  }`}
                >{c}</button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-20 text-slate-400 text-[12px]">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex items-center justify-center h-20 text-slate-400 text-[12px]">No replies found</div>
            )}
            {!loading && filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2.5 border-b border-[#E5E0D4]/60 last:border-0 hover:bg-[#F4F2ED] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#0C1B33] truncate">{r.name}</span>
                  {r.category && (
                    <span className="shrink-0 text-[10px] bg-[#F4F2ED] border border-[#E5E0D4] text-slate-500 px-1.5 py-0.5 rounded-full">{r.category}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.body}</p>
                {r.variables.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {r.variables.map((v) => (
                      <span key={v} className="text-[10px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
