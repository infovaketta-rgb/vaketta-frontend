"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useToastStore } from "@/store/toastStore";
import ConfirmationSequencesTab from "./ConfirmationSequencesTab";

type Tab = "replies" | "sequences";

type SavedReply = {
  id:        string;
  name:      string;
  category:  string | null;
  body:      string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name:     string;
  category: string;
  body:     string;
};

const EMPTY_FORM: FormState = { name: "", category: "", body: "" };

// ── Detect {{var}} placeholders for preview ───────────────────────────────────
function extractVars(body: string): string[] {
  const matches = body.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export default function SavedRepliesPage() {
  const mounted    = useMounted();
  const { addToast } = useToastStore();

  const [tab,        setTab]        = useState<Tab>("replies");
  const [replies,    setReplies]    = useState<SavedReply[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState<string | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState<SavedReply | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<SavedReply | null>(null);

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/saved-replies")
      .then(setReplies)
      .catch(() => addToast("Failed to load saved replies", "error"))
      .finally(() => setLoading(false));
  }, [mounted]);

  const categories = [...new Set(replies.map((r) => r.category).filter(Boolean))] as string[];

  const filtered = replies.filter((r) => {
    if (category && r.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.body.toLowerCase().includes(q);
    }
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(r: SavedReply) {
    setEditing(r);
    setForm({ name: r.name, category: r.category ?? "", body: r.body });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast("Name is required", "error"); return; }
    if (!form.body.trim()) { addToast("Body is required", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        name:     form.name.trim(),
        category: form.category.trim() || null,
        body:     form.body.trim(),
      };
      if (editing) {
        const updated = await apiFetch(`/saved-replies/${editing.id}`, {
          method: "PUT",
          body:   JSON.stringify(payload),
        });
        setReplies((prev) => prev.map((r) => r.id === editing.id ? updated : r));
        addToast("Saved reply updated", "success");
      } else {
        const created = await apiFetch("/saved-replies", {
          method: "POST",
          body:   JSON.stringify(payload),
        });
        setReplies((prev) => [created, ...prev]);
        addToast("Saved reply created", "success");
      }
      closeModal();
    } catch (e: any) {
      addToast(e?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: SavedReply) {
    setDeleting(r.id);
    try {
      await apiFetch(`/saved-replies/${r.id}`, { method: "DELETE" });
      setReplies((prev) => prev.filter((x) => x.id !== r.id));
      addToast("Deleted", "success");
    } catch {
      addToast("Failed to delete", "error");
    } finally {
      setDeleting(null);
      setConfirmDel(null);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-[#F4F2ED]">
      {/* Page header */}
      <div className="bg-white border-b border-[#E5E0D4] px-6 pt-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#0C1B33]">Saved Replies</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Internal message templates with <code className="text-purple-600">{"{{variable}}"}</code> support. Not sent via WhatsApp API — used by staff and automation flows.
            </p>
          </div>
          {tab === "replies" && (
            <button
              onClick={openCreate}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B52A8] text-white text-[13px] font-medium hover:bg-[#164088] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Reply
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-6 mt-3 -mb-px">
          {([
            { id: "replies"   as Tab, label: "Saved Replies" },
            { id: "sequences" as Tab, label: "Confirmation Sequences" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition ${
                tab === t.id
                  ? "border-[#7A3F91] text-[#7A3F91]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "sequences" && (
        <div className="flex-1 overflow-y-auto p-6">
          <ConfirmationSequencesTab />
        </div>
      )}

      {tab === "replies" && (
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search + filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search replies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-[#E5E0D4] outline-none focus:ring-2 focus:ring-[#1B52A8]/20 text-[#0C1B33]"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                !category ? "bg-[#1B52A8] text-white" : "bg-white border border-[#E5E0D4] text-slate-600 hover:bg-slate-50"
              }`}
            >All</button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c === category ? null : c)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                  category === c ? "bg-[#1B52A8] text-white" : "bg-white border border-[#E5E0D4] text-slate-600 hover:bg-slate-50"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E5E0D4] p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm">{search || category ? "No replies match your filter" : "No saved replies yet"}</p>
            {!search && !category && (
              <button onClick={openCreate} className="text-[13px] text-[#1B52A8] hover:underline">
                Create your first saved reply
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => {
              const vars = r.variables ?? extractVars(r.body);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-[#E5E0D4] p-4 flex flex-col gap-2 hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0C1B33] truncate">{r.name}</p>
                      {r.category && (
                        <span className="inline-block mt-1 text-[11px] bg-[#F4F2ED] border border-[#E5E0D4] text-slate-500 px-2 py-0.5 rounded-full">
                          {r.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#1B52A8] transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDel(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-[12px] text-slate-600 whitespace-pre-wrap line-clamp-4">{r.body}</p>

                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-[#E5E0D4]/60">
                      {vars.map((v) => (
                        <span key={v} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-h-[90vh] flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D4]">
              <h2 className="text-[15px] font-semibold text-[#0C1B33]">
                {editing ? "Edit Saved Reply" : "New Saved Reply"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Check-in Reminder"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B52A8] focus:ring-1 focus:ring-[#1B52A8]/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Category <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Check-in, Dining, FAQ"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B52A8] focus:ring-1 focus:ring-[#1B52A8]/20"
                  list="cat-suggestions"
                />
                {categories.length > 0 && (
                  <datalist id="cat-suggestions">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                  Body *
                  <span className="ml-1 font-normal text-slate-400">— use <code className="text-purple-600 bg-purple-50 px-1 rounded">{"{{variable_name}}"}</code> for placeholders</span>
                </label>
                <textarea
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder={"Hi {{guest_name}}, your check-in is at {{check_in_time}}. Welcome to {{hotel_name}}!"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B52A8] focus:ring-1 focus:ring-[#1B52A8]/20 resize-none"
                />
                {extractVars(form.body).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[11px] text-slate-400">Variables detected:</span>
                    {extractVars(form.body).map((v) => (
                      <span key={v} className="text-[11px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-[#E5E0D4]">
              <button
                onClick={closeModal}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-[#1B52A8] text-white text-[13px] font-medium hover:bg-[#164088] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >{saving ? "Saving…" : editing ? "Save changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDel(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-80 p-5 mx-4">
            <p className="text-[14px] font-semibold text-[#0C1B33] mb-1">Delete "{confirmDel.name}"?</p>
            <p className="text-[12px] text-slate-500 mb-4">This action cannot be undone. Any flows using this reply will skip it.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
              >Cancel</button>
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={deleting === confirmDel.id}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 disabled:opacity-40 transition"
              >{deleting === confirmDel.id ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
