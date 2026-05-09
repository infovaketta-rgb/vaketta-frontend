"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ButtonDef {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
  text: string;
}

interface Components {
  header?: { type: string; text?: string };
  body:    { text: string; examples?: string[] };
  footer?: { text: string };
  buttons?: ButtonDef[];
}

interface Template {
  id:               string;
  name:             string;
  language:         string;
  category:         string;
  status:           string;
  components:       Components;
  variableMapping?: Record<string, string> | null;
}

interface GuestContext {
  guest:          { name: string; phone: string };
  latestBooking:  {
    checkIn:         string;
    checkOut:        string;
    roomTypeName:    string;
    referenceNumber: string;
    status:          string;
  } | null;
}

interface Props {
  onSelect: (templateId: string, values: Record<string, string>) => void;
  onClose:  () => void;
  guestId?: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

// Human-readable labels for each context field
const FIELD_LABELS: Record<string, string> = {
  "guest.name":              "Guest name",
  "guest.phone":             "Guest phone",
  "booking.checkIn":         "Check-in date",
  "booking.checkOut":        "Check-out date",
  "booking.roomTypeName":    "Room type",
  "booking.referenceNumber": "Booking reference",
  "booking.status":          "Booking status",
  "hotel.name":              "Hotel name",
};

// Position-based defaults when no variableMapping is stored on the template
const DEFAULT_MAPPING: Record<number, string> = {
  1: "guest.name",
  2: "booking.checkIn",
  3: "booking.checkOut",
  4: "booking.roomTypeName",
  5: "booking.referenceNumber",
};

function varCount(text: string): number {
  return (text.match(/\{\{\d+\}\}/g) ?? []).length;
}

function buildContext(ctx: GuestContext): Record<string, string> {
  return {
    "guest.name":              ctx.guest.name,
    "guest.phone":             ctx.guest.phone,
    "booking.checkIn":         ctx.latestBooking?.checkIn         ?? "",
    "booking.checkOut":        ctx.latestBooking?.checkOut        ?? "",
    "booking.roomTypeName":    ctx.latestBooking?.roomTypeName    ?? "",
    "booking.referenceNumber": ctx.latestBooking?.referenceNumber ?? "",
    "booking.status":          ctx.latestBooking?.status         ?? "",
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TemplatePicker({ onSelect, onClose, guestId }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Template | null>(null);
  const [values, setValues]       = useState<string[]>([]);
  const [sending, setSending]     = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    apiFetch("/hotel-templates?status=APPROVED")
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter((t) =>
    !search || t.name.includes(search.toLowerCase())
  );

  async function select(t: Template) {
    const count = varCount(t.components.body.text);
    const initial = new Array(count).fill("");
    setSelected(t);
    setValues(initial);

    if (!guestId || count === 0) return;

    // Auto-fill from guest + booking context
    setContextLoading(true);
    try {
      const ctx: GuestContext = await apiFetch(`/messages/${guestId}/context`);
      const ctxMap = buildContext(ctx);
      const vm = t.variableMapping ?? {};
      const filled = Array.from({ length: count }, (_, i) => {
        const pos = i + 1;
        const field = (vm as Record<string, string>)[String(pos)] ?? DEFAULT_MAPPING[pos] ?? "";
        return ctxMap[field] ?? "";
      });
      setValues(filled);
    } catch {
      // Context fetch failed — leave values blank, user fills manually
    } finally {
      setContextLoading(false);
    }
  }

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    const valuesMap: Record<string, string> = {};
    values.forEach((v, i) => { valuesMap[String(i + 1)] = v; });
    onSelect(selected.id, valuesMap);
    setSending(false);
  }

  // Label for {{n}} — use variableMapping if available, fall back to position defaults
  function varLabel(t: Template, pos: number): string {
    const vm = (t.variableMapping ?? {}) as Record<string, string>;
    const field = vm[String(pos)] ?? DEFAULT_MAPPING[pos] ?? "";
    return FIELD_LABELS[field] ? `{{${pos}}} — ${FIELD_LABELS[field]}` : `{{${pos}}}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {selected && (
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 transition mr-1">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="font-semibold text-[#0C1B33] text-sm">
              {selected ? selected.name : "Use Template"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            /* ── Template list ── */
            <div>
              <div className="px-4 py-3 border-b border-gray-50">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
              </div>

              {loading ? (
                <div className="space-y-2 p-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="h-12 flex-1 bg-gray-100 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-sm text-gray-500">
                    {templates.length === 0
                      ? "No approved templates found."
                      : "No templates match your search."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {filtered.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => select(t)}
                        className="w-full px-5 py-3.5 text-left hover:bg-gray-50 transition flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 font-mono truncate">{t.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {t.components.body.text}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {t.category}
                            </span>
                            <span className="text-[10px] text-gray-400">{t.language}</span>
                            {varCount(t.components.body.text) > 0 && (
                              <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                                {varCount(t.components.body.text)} variable{varCount(t.components.body.text) > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* ── Variable fill-in + preview ── */
            <div className="p-5 space-y-5">
              {/* Body preview */}
              <div className="bg-[#e5ddd5] rounded-2xl p-3">
                <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm">
                  {selected.components.header?.type === "TEXT" && selected.components.header.text && (
                    <p className="text-[13px] font-semibold text-gray-900 mb-1">{selected.components.header.text}</p>
                  )}
                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {selected.components.body.text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                      const v = values[parseInt(n) - 1];
                      return v ? v : `[${n}]`;
                    })}
                  </p>
                  {selected.components.footer?.text && (
                    <p className="text-[11px] text-gray-400 mt-1">{selected.components.footer.text}</p>
                  )}
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-gray-400">10:30 AM ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Variable inputs */}
              {values.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Fill in variables</p>
                    {contextLoading && (
                      <span className="flex items-center gap-1.5 text-xs text-purple-500">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Auto-filling…
                      </span>
                    )}
                  </div>
                  {values.map((v, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {varLabel(selected, i + 1)}
                      </label>
                      <input
                        value={v}
                        onChange={(e) => {
                          const next = [...values];
                          next[i] = e.target.value;
                          setValues(next);
                        }}
                        placeholder={selected.components.body.examples?.[i] ?? `Value for {{${i + 1}}}`}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {values.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  This template has no variables — it will be sent as-is.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer — only shown when a template is selected */}
        {selected && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={handleSend}
              disabled={sending || contextLoading || values.some((v) => !v.trim() && values.length > 0)}
              className="flex-1 bg-[#1B52A8] hover:bg-[#163f82] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              {sending && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Send Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
