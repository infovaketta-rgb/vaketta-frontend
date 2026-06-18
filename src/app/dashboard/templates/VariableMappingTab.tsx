"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";

// ── Types ───────────────────────────────────────────────────────────────────────

type SourceType = "BOOKING_FIELD" | "FLOW_VAR";

interface Template {
  id: string;
  name: string;
  language?: string;
  status?: string;
  components: { body?: { text?: string } };
}

interface MappingRow {
  variableName: string;
  sourceType:   SourceType;
  sourceKey:    string;
}

// Booking fields — must match the backend buildVars() keys exactly (the resolution
// target at confirm time). Label is for display only.
const BOOKING_FIELDS: { key: string; label: string }[] = [
  { key: "guestName",  label: "Guest name" },
  { key: "bookingRef", label: "Booking reference" },
  { key: "checkIn",    label: "Check-in date" },
  { key: "checkOut",   label: "Check-out date" },
  { key: "roomType",   label: "Room type" },
];

// Brand purple family (matches the Confirmation Sequences tab).
const C = { primary: "#7A3F91", bgSoft: "#F2EAF7", sidebar: "#2B0D3E" };

// Parse {{var}} names from a template body — mirrors the backend extractor.
function extractVars(bodyText: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyText ?? "")) !== null) {
    const id = m[1]!;
    if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function VariableMappingTab() {
  const { addToast } = useToastStore();

  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [flowVarNames, setFlowVarNames] = useState<string[]>([]);
  const [loading,      setLoading]      = useState(true);

  const [selectedId, setSelectedId] = useState<string>("");
  // per-variable working state: { [variableName]: { sourceType, sourceKey } }
  const [rows,    setRows]    = useState<Record<string, { sourceType: SourceType; sourceKey: string }>>({});
  const [saving,  setSaving]  = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/hotel-templates?status=APPROVED&limit=100").then((d) => (Array.isArray(d) ? d : (d?.data ?? []))).catch(() => []),
      apiFetch("/hotel-templates/flow-var-names").then((d) => d?.names ?? []).catch(() => []),
    ])
      .then(([tpls, names]) => {
        setTemplates(tpls);
        setFlowVarNames(names);
        if (tpls.length > 0) setSelectedId(tpls[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);
  const varNames = useMemo(
    () => (selected ? extractVars(selected.components?.body?.text ?? "") : []),
    [selected]
  );

  // Load saved mappings whenever the selected template changes.
  useEffect(() => {
    if (!selectedId) { setRows({}); return; }
    setLoadingMappings(true);
    apiFetch(`/hotel-templates/${selectedId}/variable-mappings`)
      .then((d) => {
        const next: Record<string, { sourceType: SourceType; sourceKey: string }> = {};
        for (const m of (d?.mappings ?? []) as MappingRow[]) {
          next[m.variableName] = { sourceType: m.sourceType, sourceKey: m.sourceKey };
        }
        setRows(next);
      })
      .catch(() => addToast("Failed to load mappings", "error"))
      .finally(() => setLoadingMappings(false));
  }, [selectedId]);

  function setSourceType(name: string, sourceType: SourceType) {
    // Changing the type clears the dependent key (different option set).
    setRows((r) => ({ ...r, [name]: { sourceType, sourceKey: "" } }));
  }
  function setSourceKey(name: string, sourceKey: string) {
    setRows((r) => ({
      ...r,
      [name]: { sourceType: r[name]?.sourceType ?? "BOOKING_FIELD", sourceKey },
    }));
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    try {
      // Only persist complete rows; blank sourceKey = unmapped (manual input).
      const mappings = varNames
        .map((name) => ({ variableName: name, ...rows[name] }))
        .filter((m) => m.sourceKey && m.sourceType);
      await apiFetch(`/hotel-templates/${selectedId}/variable-mappings`, {
        method: "PUT",
        body: JSON.stringify({ mappings }),
      });
      addToast("Variable mapping saved", "success");
    } catch (e: any) {
      addToast(e?.message || "Failed to save mapping", "error");
    } finally {
      setSaving(false);
    }
  }

  const selectCls =
    "w-full border border-[#E5E0D4] rounded-lg px-2.5 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#7A3F91]/25 focus:border-[#7A3F91]";

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-white rounded-xl border border-[#E5E0D4] animate-pulse" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No approved templates yet. Sync templates from Meta first, then map their variables here.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Template picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={selectCls}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.language ? ` (${t.language})` : ""}</option>
          ))}
        </select>
      </div>

      {/* Body preview */}
      {selected?.components?.body?.text && (
        <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0C1B33]/40 mb-1">Template body</p>
          <p className="text-[12px] text-[#0C1B33]/70 whitespace-pre-wrap font-mono">{selected.components.body.text}</p>
        </div>
      )}

      {/* Variable rows */}
      {loadingMappings ? (
        <div className="h-20 bg-white rounded-xl border border-[#E5E0D4] animate-pulse" />
      ) : varNames.length === 0 ? (
        <p className="text-sm text-gray-500">This template has no <code className="text-[#7A3F91]">{"{{variable}}"}</code> placeholders.</p>
      ) : (
        <div className="space-y-3">
          {varNames.map((name) => {
            const row = rows[name] ?? { sourceType: "BOOKING_FIELD" as SourceType, sourceKey: "" };
            return (
              <div key={name} className="rounded-xl border border-[#E5E0D4] bg-white p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono px-1.5 py-0.5 rounded" style={{ background: C.bgSoft, color: C.primary }}>
                    {`{{${name}}}`}
                  </span>
                  <span className="text-[11px] text-gray-400">resolve from</span>
                </div>
                <div className="flex gap-2">
                  {/* Source-type toggle */}
                  <div className="inline-flex rounded-lg border border-[#E5E0D4] p-0.5 shrink-0">
                    {(["BOOKING_FIELD", "FLOW_VAR"] as SourceType[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSourceType(name, st)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium transition"
                        style={row.sourceType === st ? { background: C.primary, color: "#fff" } : { color: "#64748b" }}
                      >
                        {st === "BOOKING_FIELD" ? "Booking Field" : "Flow Variable"}
                      </button>
                    ))}
                  </div>
                  {/* Dependent dropdown */}
                  <select
                    value={row.sourceKey}
                    onChange={(e) => setSourceKey(name, e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— no mapping (staff fills manually) —</option>
                    {row.sourceType === "BOOKING_FIELD"
                      ? BOOKING_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)
                      : flowVarNames.map((fv) => <option key={fv} value={fv}>{fv}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {varNames.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-[13px] font-medium disabled:opacity-50 transition"
          style={{ background: C.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.sidebar)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
        >
          {saving ? "Saving…" : "Save mapping"}
        </button>
      )}
    </div>
  );
}
