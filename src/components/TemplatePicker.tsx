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
  body:    { text: string; examples?: string[]; namedExamples?: Record<string, string> };
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

// Named-variable name → context-field heuristic (used when the template uses {{guestname}} style)
const NAME_TO_FIELD: Record<string, string> = {
  guestname:       "guest.name",
  guest_name:      "guest.name",
  name:            "guest.name",
  customername:    "guest.name",
  customer_name:   "guest.name",
  phone:           "guest.phone",
  guestphone:      "guest.phone",
  guest_phone:     "guest.phone",
  checkin:         "booking.checkIn",
  check_in:        "booking.checkIn",
  checkindate:     "booking.checkIn",
  check_in_date:   "booking.checkIn",
  checkout:        "booking.checkOut",
  check_out:       "booking.checkOut",
  checkoutdate:    "booking.checkOut",
  check_out_date:  "booking.checkOut",
  roomtype:        "booking.roomTypeName",
  room_type:       "booking.roomTypeName",
  room:            "booking.roomTypeName",
  reference:       "booking.referenceNumber",
  referencenumber: "booking.referenceNumber",
  reference_number:"booking.referenceNumber",
  bookingref:      "booking.referenceNumber",
  booking_ref:     "booking.referenceNumber",
  bookingid:       "booking.referenceNumber",
  status:          "booking.status",
  bookingstatus:   "booking.status",
  hotel:           "hotel.name",
  hotelname:       "hotel.name",
  hotel_name:      "hotel.name",
};

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Returns ordered list of unique variable identifiers ("1","2",… or "guestname",…)
function extractVarIds(text: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    if (id && !seen.has(id)) { seen.add(id); ids.push(id); }
  }
  return ids;
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
  const [varIds, setVarIds]       = useState<string[]>([]);
  const [values, setValues]       = useState<Record<string, string>>({});
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

  function fieldFor(t: Template, id: string): string {
    const vm = (t.variableMapping ?? {}) as Record<string, string>;
    if (vm[id]) return vm[id];
    if (/^\d+$/.test(id)) {
      return DEFAULT_MAPPING[parseInt(id, 10)] ?? "";
    }
    return NAME_TO_FIELD[id.toLowerCase()] ?? "";
  }

  async function select(t: Template) {
    const ids = extractVarIds(t.components.body.text);
    setSelected(t);
    setVarIds(ids);
    setValues(Object.fromEntries(ids.map((id) => [id, ""])));

    if (!guestId || ids.length === 0) return;

    // Auto-fill from guest + booking context
    setContextLoading(true);
    try {
      const ctx: GuestContext = await apiFetch(`/messages/${guestId}/context`);
      const ctxMap = buildContext(ctx);
      const filled: Record<string, string> = {};
      for (const id of ids) {
        const field = fieldFor(t, id);
        filled[id] = ctxMap[field] ?? "";
      }
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
    onSelect(selected.id, { ...values });
    setSending(false);
  }

  // Label for a variable — use variableMapping if available, then defaults / name heuristic
  function varLabel(t: Template, id: string): string {
    const field = fieldFor(t, id);
    const display = `{{${id}}}`;
    return FIELD_LABELS[field] ? `${display} — ${FIELD_LABELS[field]}` : display;
  }

  function placeholderFor(t: Template, id: string, idx: number): string {
    if (t.components.body.namedExamples?.[id]) return t.components.body.namedExamples[id]!;
    if (t.components.body.examples?.[idx])     return t.components.body.examples[idx]!;
    return `Value for {{${id}}}`;
  }

  const allValuesFilled = varIds.every((id) => (values[id] ?? "").trim().length > 0);

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
                            {extractVarIds(t.components.body.text).length > 0 && (
                              <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                                {extractVarIds(t.components.body.text).length} variable{extractVarIds(t.components.body.text).length > 1 ? "s" : ""}
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
                    {selected.components.body.text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, id) => {
                      const v = values[id];
                      return v ? v : `[${id}]`;
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
              {varIds.length > 0 && (
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
                  {varIds.map((id, i) => (
                    <div key={id}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {varLabel(selected, id)}
                      </label>
                      <input
                        value={values[id] ?? ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [id]: e.target.value }))}
                        placeholder={placeholderFor(selected, id, i)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {varIds.length === 0 && (
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
              disabled={sending || contextLoading || (varIds.length > 0 && !allValuesFilled)}
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
