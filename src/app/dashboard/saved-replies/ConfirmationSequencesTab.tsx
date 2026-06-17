"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";

// ── Types ───────────────────────────────────────────────────────────────────────

type Channel = "WHATSAPP" | "INSTAGRAM";
type RefType = "TEMPLATE" | "SAVED_REPLY";

type Step = {
  order:   number;
  refType: RefType;
  refId:   string;
  title?:  string | null;
  body?:   string | null;
};

type Sequence = {
  id:            string;
  channel:       Channel;
  name:          string;
  isDefault:     boolean;
  roomTypeScope: string[];
  steps:         Step[];
};

type RoomType    = { id: string; name: string };
type WaTemplate  = { id: string; name: string; language?: string };
type SavedReply  = { id: string; name: string };

const MAX_STEPS = 10;

// Brand palette (purple family) — kept local so the tab reads as one surface.
const C = {
  primary: "#7A3F91",
  hover:   "#C59DD9",
  bgSoft:  "#F2EAF7",
  sidebar: "#2B0D3E",
};

// ── Client-side mirror of validateSequenceSteps (backend is source of truth) ─────
function validateSteps(steps: Step[], channel: Channel): string | null {
  if (steps.length === 0) return "Add at least one step.";
  if (steps.length > MAX_STEPS) return `A sequence can have at most ${MAX_STEPS} steps.`;
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  if (channel === "INSTAGRAM") {
    if (ordered.some((s) => s.refType === "TEMPLATE")) {
      return "Instagram sequences can only use saved replies.";
    }
    return null;
  }
  // WHATSAPP
  if (ordered[0]?.refType !== "TEMPLATE") return "The first step must be a template.";
  let seenTemplate = false;
  for (const s of ordered) {
    if (s.refType === "TEMPLATE") seenTemplate = true;
    else if (!seenTemplate) return "A saved-reply step must come after a template step.";
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function ConfirmationSequencesTab() {
  const { addToast } = useToastStore();

  const [channel,   setChannel]   = useState<Channel>("WHATSAPP");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [replies,   setReplies]   = useState<SavedReply[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<Sequence | null>(null);
  const [confirmDel, setConfirmDel] = useState<Sequence | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  // Reference data — loaded once.
  useEffect(() => {
    apiFetch("/room-types")
      .then((d) => setRoomTypes(Array.isArray(d) ? d : (d?.data ?? [])))
      .catch(() => {});
    apiFetch("/hotel-templates?status=APPROVED&limit=100")
      .then((d) => setTemplates(Array.isArray(d) ? d : (d?.data ?? [])))
      .catch(() => {});
    apiFetch("/saved-replies")
      .then((d) => setReplies(Array.isArray(d) ? d : (d?.data ?? [])))
      .catch(() => {});
  }, []);

  // Sequences — reloaded on channel switch.
  useEffect(() => {
    setLoading(true);
    apiFetch(`/confirmation-sequences?channel=${channel}`)
      .then((d) => setSequences(Array.isArray(d) ? d : []))
      .catch(() => addToast("Failed to load confirmation sequences", "error"))
      .finally(() => setLoading(false));
  }, [channel]);

  const roomTypeName = useMemo(() => {
    const m = new Map(roomTypes.map((r) => [r.id, r.name]));
    return (id: string) => m.get(id) ?? id;
  }, [roomTypes]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(s: Sequence) { setEditing(s); setModalOpen(true); }

  function onSaved(saved: Sequence) {
    setSequences((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      let next = exists ? prev.map((s) => s.id === saved.id ? saved : s) : [saved, ...prev];
      // Only one default per channel — reflect that in the list immediately.
      if (saved.isDefault) next = next.map((s) => s.id === saved.id ? s : { ...s, isDefault: false });
      return next;
    });
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(s: Sequence) {
    setDeleting(s.id);
    try {
      await apiFetch(`/confirmation-sequences/${s.id}`, { method: "DELETE" });
      setSequences((prev) => prev.filter((x) => x.id !== s.id));
      addToast("Sequence deleted", "success");
    } catch {
      addToast("Failed to delete", "error");
    } finally {
      setDeleting(null);
      setConfirmDel(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Channel toggle + create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-[#E5E0D4] bg-white p-0.5">
          {(["WHATSAPP", "INSTAGRAM"] as Channel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium transition"
              style={channel === ch
                ? { background: C.primary, color: "#fff" }
                : { color: "#64748b" }}
            >
              {ch === "WHATSAPP" ? "WhatsApp" : "Instagram"}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-medium transition"
          style={{ background: C.primary }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.sidebar)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sequence
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E0D4] p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && sequences.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <p className="text-sm">No {channel === "WHATSAPP" ? "WhatsApp" : "Instagram"} sequences yet</p>
          <button onClick={openCreate} className="text-[13px] hover:underline" style={{ color: C.primary }}>
            Create your first sequence
          </button>
        </div>
      )}

      {/* List */}
      {!loading && sequences.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-[#E5E0D4] p-4 flex flex-col gap-2.5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#0C1B33] truncate">{s.name}</p>
                    {s.isDefault && (
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: C.bgSoft, color: C.primary }}>
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.steps.length} step{s.steps.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" title="Edit"
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.primary)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "")}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setConfirmDel(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition" title="Delete">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scope chips */}
              <div className="flex flex-wrap gap-1">
                {s.roomTypeScope.length === 0 ? (
                  <span className="text-[10px] bg-[#F4F2ED] border border-[#E5E0D4] text-slate-500 px-2 py-0.5 rounded-full">All room types</span>
                ) : (
                  s.roomTypeScope.map((id) => (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.bgSoft, color: C.primary }}>
                      {roomTypeName(id)}
                    </span>
                  ))
                )}
              </div>

              {/* Step preview */}
              <div className="flex flex-col gap-1 pt-1 border-t border-[#E5E0D4]/60">
                {s.steps.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="text-slate-300">{i + 1}.</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={st.refType === "TEMPLATE"
                            ? { background: "#E0F2FE", color: "#0369A1" }
                            : { background: C.bgSoft, color: C.primary }}>
                      {st.refType === "TEMPLATE" ? "Template" : "Saved Reply"}
                    </span>
                    <span className="truncate">{st.title ?? st.refId}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <SequenceModal
          channel={channel}
          editing={editing}
          roomTypes={roomTypes}
          templates={templates}
          replies={replies}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
             onClick={(e) => { if (e.target === e.currentTarget) setConfirmDel(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-80 p-5 mx-4">
            <p className="text-[14px] font-semibold text-[#0C1B33] mb-1">Delete "{confirmDel.name}"?</p>
            <p className="text-[12px] text-slate-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => handleDelete(confirmDel)} disabled={deleting === confirmDel.id}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 disabled:opacity-40 transition">
                {deleting === confirmDel.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create / Edit modal ──────────────────────────────────────────────────────────

function SequenceModal({
  channel, editing, roomTypes, templates, replies, onClose, onSaved,
}: {
  channel:   Channel;
  editing:   Sequence | null;
  roomTypes: RoomType[];
  templates: WaTemplate[];
  replies:   SavedReply[];
  onClose:   () => void;
  onSaved:   (s: Sequence) => void;
}) {
  const { addToast } = useToastStore();

  const [name,      setName]      = useState(editing?.name ?? "");
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [allRoomTypes, setAllRoomTypes] = useState(editing ? editing.roomTypeScope.length === 0 : true);
  const [scope,     setScope]     = useState<string[]>(editing?.roomTypeScope ?? []);
  const [steps,     setSteps]     = useState<Step[]>(
    editing ? editing.steps.map((s, i) => ({ ...s, order: i })) : []
  );
  const [saving,    setSaving]    = useState(false);

  // Instagram can't use templates; pre-pick the allowed type for the add picker.
  const [pickType, setPickType] = useState<RefType>(channel === "INSTAGRAM" ? "SAVED_REPLY" : "TEMPLATE");
  const [pickId,   setPickId]   = useState("");

  const validationError = validateSteps(steps, channel);
  const atCap = steps.length >= MAX_STEPS;

  function addStep() {
    if (!pickId || atCap) return;
    setSteps((prev) => [...prev, { order: prev.length, refType: pickType, refId: pickId }]);
    setPickId("");
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  }

  function move(idx: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  function labelFor(s: Step): string {
    if (s.refType === "TEMPLATE") return templates.find((t) => t.id === s.refId)?.name ?? s.title ?? s.refId;
    return replies.find((r) => r.id === s.refId)?.name ?? s.title ?? s.refId;
  }

  async function handleSave() {
    if (!name.trim()) { addToast("Name is required", "error"); return; }
    if (validationError) { addToast(validationError, "error"); return; }
    setSaving(true);
    try {
      const payload = {
        channel,
        name: name.trim(),
        isDefault,
        roomTypeScope: allRoomTypes ? [] : scope,
        steps: steps.map((s, i) => ({ order: i, refType: s.refType, refId: s.refId })),
      };
      const saved = editing
        ? await apiFetch(`/confirmation-sequences/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/confirmation-sequences", { method: "POST", body: JSON.stringify(payload) });
      addToast(editing ? "Sequence updated" : "Sequence created", "success");
      onSaved(saved);
    } catch (e: any) {
      addToast(e?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7A3F91] focus:ring-1 focus:ring-[#7A3F91]/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-[560px] max-h-[90vh] flex flex-col overflow-hidden mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D4]">
          <h2 className="text-[15px] font-semibold text-[#0C1B33]">
            {editing ? "Edit Sequence" : "New Sequence"}
            <span className="ml-2 text-[11px] font-normal text-slate-400">
              {channel === "WHATSAPP" ? "WhatsApp" : "Instagram"}
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="e.g. Standard confirmation" className={inputCls} autoFocus />
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
                   className="w-4 h-4 rounded accent-[#7A3F91]" />
            <span className="text-[13px] text-slate-700">Set as default for this channel</span>
          </label>

          {/* Room type scope */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Room type scope</label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none mb-2">
              <input type="checkbox" checked={allRoomTypes} onChange={(e) => setAllRoomTypes(e.target.checked)}
                     className="w-4 h-4 rounded accent-[#7A3F91]" />
              <span className="text-[13px] text-slate-700">All room types</span>
            </label>
            {!allRoomTypes && (
              <div className="flex flex-wrap gap-1.5">
                {roomTypes.length === 0 && <span className="text-[12px] text-slate-400">No room types found.</span>}
                {roomTypes.map((rt) => {
                  const on = scope.includes(rt.id);
                  return (
                    <button key={rt.id} type="button"
                            onClick={() => setScope((prev) => on ? prev.filter((x) => x !== rt.id) : [...prev, rt.id])}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition"
                            style={on
                              ? { background: C.primary, color: "#fff", borderColor: C.primary }
                              : { background: "#fff", color: "#64748b", borderColor: "#E5E0D4" }}>
                      {rt.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step builder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-slate-600">Steps</label>
              <span className="text-[11px] text-slate-400">{steps.length} / {MAX_STEPS}</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-[#E5E0D4] bg-[#F4F2ED] px-2.5 py-2">
                  <span className="text-[11px] text-slate-400 w-4">{i + 1}.</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={s.refType === "TEMPLATE"
                          ? { background: "#E0F2FE", color: "#0369A1" }
                          : { background: C.bgSoft, color: C.primary }}>
                    {s.refType === "TEMPLATE" ? "Template" : "Saved Reply"}
                  </span>
                  <span className="flex-1 text-[12px] text-slate-700 truncate">{labelFor(s)}</span>
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                          className="p-1 text-slate-400 hover:text-[#7A3F91] disabled:opacity-30 transition" title="Move up">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === steps.length - 1}
                          className="p-1 text-slate-400 hover:text-[#7A3F91] disabled:opacity-30 transition" title="Move down">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button onClick={() => removeStep(i)} className="p-1 text-slate-400 hover:text-red-500 transition" title="Remove">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add step */}
            <div className="flex items-center gap-2">
              {/* On Instagram the type is locked to SAVED_REPLY. */}
              <select value={pickType} disabled={channel === "INSTAGRAM"}
                      onChange={(e) => { setPickType(e.target.value as RefType); setPickId(""); }}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-[12px] outline-none focus:border-[#7A3F91] disabled:bg-slate-50 disabled:text-slate-400">
                {channel === "WHATSAPP" && <option value="TEMPLATE">Template</option>}
                <option value="SAVED_REPLY">Saved Reply</option>
              </select>
              <select value={pickId} onChange={(e) => setPickId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-[12px] outline-none focus:border-[#7A3F91]">
                <option value="">Select {pickType === "TEMPLATE" ? "a template" : "a saved reply"}…</option>
                {(pickType === "TEMPLATE" ? templates : replies).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <button onClick={addStep} disabled={!pickId || atCap}
                      title={atCap ? `Maximum ${MAX_STEPS} steps reached` : undefined}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
                      style={{ background: C.primary }}>
                Add
              </button>
            </div>

            {validationError && steps.length > 0 && (
              <p className="mt-2 text-[12px] text-red-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
                {validationError}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#E5E0D4]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving || !!validationError || !name.trim()}
                  className="flex-1 py-2 rounded-lg text-white text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
                  style={{ background: C.primary }}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
