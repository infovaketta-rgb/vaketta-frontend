"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { useMounted } from "@/lib/useMounted";

// ── Types ──────────────────────────────────────────────────────────────────────

type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
type TemplateStatus   = "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED";

interface ButtonDef {
  type:        "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
  text:        string;
  url?:        string;
  phone?:      string;
  example?:    string;
}

interface Components {
  header?: { type: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string };
  body:    { text: string; examples?: string[] };
  footer?: { text: string };
  buttons?: ButtonDef[];
}

interface Template {
  id:               string;
  name:             string;
  language:         string;
  category:         TemplateCategory;
  status:           TemplateStatus;
  qualityScore?:    string | null;
  metaTemplateId?:  string | null;
  rejectionReason?: string | null;
  components:       Components;
  createdAt:        string;
  updatedAt:        string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en",    label: "English" },
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "ar",    label: "Arabic" },
  { code: "de",    label: "German" },
  { code: "es",    label: "Spanish" },
  { code: "fr",    label: "French" },
  { code: "hi",    label: "Hindi" },
  { code: "it",    label: "Italian" },
  { code: "ja",    label: "Japanese" },
  { code: "ko",    label: "Korean" },
  { code: "ms",    label: "Malay" },
  { code: "pt_BR", label: "Portuguese (BR)" },
  { code: "ru",    label: "Russian" },
  { code: "tr",    label: "Turkish" },
  { code: "zh_CN", label: "Chinese (Simplified)" },
];

const CATEGORIES: TemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"];

const STATUS_COLORS: Record<TemplateStatus, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PAUSED:   "bg-orange-100 text-orange-700",
  DISABLED: "bg-gray-100 text-gray-500",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  MARKETING:      "bg-purple-100 text-purple-700",
  UTILITY:        "bg-blue-100 text-blue-700",
  AUTHENTICATION: "bg-amber-100 text-amber-700",
};

// ── WhatsApp Preview ───────────────────────────────────────────────────────────

function WhatsAppPreview({ components, name }: { components: Partial<Components>; name: string }) {
  const headerText = components.header?.type === "TEXT" ? components.header.text : null;
  const body       = components.body?.text ?? "";
  const footer     = components.footer?.text;
  const buttons    = components.buttons ?? [];

  return (
    <div className="flex flex-col items-center bg-[#e5ddd5] rounded-2xl p-4 min-h-[200px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZTVkZGQ1Ii8+PC9zdmc+')]">
      <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        {components.header && (
          <div className="px-3 pt-2.5 pb-1">
            {components.header.type === "TEXT" && headerText && (
              <p className="text-[13px] font-semibold text-gray-900 leading-snug">{headerText}</p>
            )}
            {components.header.type === "IMAGE" && (
              <div className="w-full h-28 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-3 py-2">
          <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
            {body || <span className="text-gray-400 italic">Message body…</span>}
          </p>
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-3 pb-2">
            <p className="text-[11px] text-gray-400">{footer}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="px-3 pb-1.5 flex justify-end">
          <span className="text-[10px] text-gray-400">10:30 AM ✓✓</span>
        </div>

        {/* Buttons */}
        {buttons.length > 0 && (
          <div className="border-t border-gray-100">
            {buttons.map((btn, i) => (
              <button
                key={i}
                className="w-full px-3 py-2 text-[13px] text-[#00a5f4] font-medium text-center hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
              >
                {btn.type === "URL" && (
                  <svg className="inline w-3.5 h-3.5 mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
                {btn.type === "PHONE_NUMBER" && (
                  <svg className="inline w-3.5 h-3.5 mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
                  </svg>
                )}
                {btn.text || "Button"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template name pill */}
      {name && (
        <p className="mt-2 text-[10px] text-gray-500 bg-white/60 rounded-full px-2 py-0.5 font-mono">{name}</p>
      )}
    </div>
  );
}

// ── Button Editor ──────────────────────────────────────────────────────────────

function ButtonEditor({
  buttons,
  onChange,
}: {
  buttons: ButtonDef[];
  onChange: (b: ButtonDef[]) => void;
}) {
  const hasQR  = buttons.some((b) => b.type === "QUICK_REPLY");
  const hasCTA = buttons.some((b) => ["URL", "PHONE_NUMBER", "COPY_CODE"].includes(b.type));

  function addButton(type: ButtonDef["type"]) {
    if (buttons.length >= 10) return;
    onChange([...buttons, { type, text: "" }]);
  }

  function update(i: number, patch: Partial<ButtonDef>) {
    const next = buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    onChange(next);
  }

  function remove(i: number) {
    onChange(buttons.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {buttons.map((btn, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-2">
              <input
                value={btn.text}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="Button label"
                maxLength={25}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <span className="shrink-0 text-xs text-gray-400 self-center">{btn.type}</span>
            </div>
            {btn.type === "URL" && (
              <input
                value={btn.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="https://example.com/{{1}}"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            )}
            {btn.type === "PHONE_NUMBER" && (
              <input
                value={btn.phone ?? ""}
                onChange={(e) => update(i, { phone: e.target.value })}
                placeholder="+1 650 555 1234"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            )}
            {btn.type === "COPY_CODE" && (
              <input
                value={btn.example ?? ""}
                onChange={(e) => update(i, { example: e.target.value })}
                placeholder="Example code (e.g. PROMO20)"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            )}
          </div>
          <button onClick={() => remove(i)} className="mt-1.5 text-red-400 hover:text-red-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        {!hasCTA && buttons.length < 10 && (
          <button
            type="button"
            onClick={() => addButton("QUICK_REPLY")}
            className="text-xs px-2.5 py-1 rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 transition"
          >
            + Quick Reply
          </button>
        )}
        {!hasQR && buttons.length < 10 && (
          <>
            <button
              type="button"
              onClick={() => addButton("URL")}
              className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
            >
              + URL
            </button>
            <button
              type="button"
              onClick={() => addButton("PHONE_NUMBER")}
              className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition"
            >
              + Phone
            </button>
            <button
              type="button"
              onClick={() => addButton("COPY_CODE")}
              className="text-xs px-2.5 py-1 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
            >
              + Copy Code
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Form defaults ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:       "",
  language:   "en",
  category:   "MARKETING" as TemplateCategory,
  components: {
    header:  undefined as Components["header"] | undefined,
    body:    { text: "", examples: [] as string[] },
    footer:  undefined as { text: string } | undefined,
    buttons: [] as ButtonDef[],
  },
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const mounted = useMounted();
  const { addToast } = useToastStore();

  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterCat, setFilterCat]     = useState<TemplateCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<TemplateStatus | "">("");

  // Slide-over
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editing, setEditing]         = useState<Template | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");

  // Delete confirmation
  const [deleting, setDeleting]       = useState<string | null>(null);

  // Syncing
  const [syncing, setSyncing]         = useState<string | null>(null);

  // Variable examples state
  const varCountBody = (form.components.body.text.match(/\{\{\d+\}\}/g) ?? []).length;

  // ── Data ────────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat)    params.set("category", filterCat);
      if (filterStatus) params.set("status",   filterStatus);
      if (search.trim()) params.set("search",  search.trim());
      const data = await apiFetch(`/hotel-templates?${params}`);
      setTemplates(data);
    } catch {
      addToast("Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) load();
  }, [mounted, filterCat, filterStatus]);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setPanelOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setFormError("");
    setForm({
      name:     t.name,
      language: t.language,
      category: t.category,
      components: {
        header:  t.components.header,
        body:    { text: t.components.body.text, examples: t.components.body.examples ?? [] },
        footer:  t.components.footer,
        buttons: t.components.buttons ?? [],
      },
    });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
    setFormError("");
  }

  function patchComponents(patch: Partial<typeof form.components>) {
    setForm((f) => ({ ...f, components: { ...f.components, ...patch } }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name:       form.name,
        language:   form.language,
        category:   form.category,
        components: {
          ...(form.components.header   && { header: form.components.header }),
          body: {
            text:     form.components.body.text,
            ...(form.components.body.examples?.length
              ? { examples: form.components.body.examples }
              : {}),
          },
          ...(form.components.footer?.text && { footer: form.components.footer }),
          ...(form.components.buttons?.length && { buttons: form.components.buttons }),
        },
      };

      if (editing) {
        const updated = await apiFetch(`/hotel-templates/${editing.id}`, {
          method: "PUT",
          body:   JSON.stringify(payload),
        });
        setTemplates((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        addToast("Template updated", "success");
      } else {
        const created = await apiFetch("/hotel-templates", {
          method: "POST",
          body:   JSON.stringify(payload),
        });
        setTemplates((prev) => [created, ...prev]);
        addToast("Template submitted for review", "success");
      }
      closePanel();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/hotel-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      addToast("Template deleted", "success");
    } catch (err: any) {
      addToast(err.message ?? "Failed to delete", "error");
    } finally {
      setDeleting(null);
    }
  }

  // ── Sync ──────────────────────────────────────────────────────────────────────

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const updated = await apiFetch(`/hotel-templates/${id}/sync`, { method: "POST" });
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      addToast("Template synced", "success");
    } catch (err: any) {
      addToast(err.message ?? "Sync failed", "error");
    } finally {
      setSyncing(null);
    }
  }

  if (!mounted) return null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#F4F2ED]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0C1B33]">WhatsApp Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage message templates for proactive guest outreach.</p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#1B52A8] hover:bg-[#1442889] text-white text-sm font-medium rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-9 pr-3 py-2 border border-[#E5E0D4] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 w-52"
          />
        </div>

        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as TemplateCategory | "")}
          className="border border-[#E5E0D4] rounded-xl text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TemplateStatus | "")}
          className="border border-[#E5E0D4] rounded-xl text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="">All statuses</option>
          {(["PENDING","APPROVED","REJECTED","PAUSED","DISABLED"] as TemplateStatus[]).map((s) =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E0D4] p-4 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No templates yet</p>
            <button onClick={openCreate} className="text-sm text-[#1B52A8] hover:underline">
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                syncing={syncing === t.id}
                onEdit={() => openEdit(t)}
                onDelete={() => setDeleting(t.id)}
                onSync={() => handleSync(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <p className="font-semibold text-gray-900">Delete template?</p>
            <p className="text-sm text-gray-600">This will also remove it from Meta. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleting)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2 text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over form */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#0C1B33]">
                {editing ? "Edit Template" : "New Template"}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col lg:flex-row gap-0 h-full">
                {/* Form */}
                <div className="flex-1 p-6 space-y-5 overflow-y-auto">

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                      disabled={!!editing}
                      placeholder="e.g. booking_confirmation"
                      maxLength={512}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-400 font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-400">Lowercase letters, numbers and underscores only. Cannot be changed after creation.</p>
                  </div>

                  {/* Language + Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language <span className="text-red-400">*</span></label>
                      <select
                        value={form.language}
                        onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-400">*</span></label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TemplateCategory }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Header */}
                  {form.category !== "AUTHENTICATION" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Header <span className="text-gray-400 font-normal">(optional)</span></label>
                      <div className="flex gap-2 mb-2">
                        {([undefined, "TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as const).map((t) => (
                          <button
                            key={String(t)}
                            type="button"
                            onClick={() => patchComponents({ header: t ? { type: t } : undefined })}
                            className={`text-xs px-2.5 py-1 rounded-full border transition ${
                              (form.components.header?.type ?? undefined) === t
                                ? "border-purple-400 bg-purple-50 text-purple-700"
                                : "border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {t ?? "None"}
                          </button>
                        ))}
                      </div>
                      {form.components.header?.type === "TEXT" && (
                        <input
                          value={form.components.header.text ?? ""}
                          onChange={(e) => patchComponents({ header: { type: "TEXT", text: e.target.value } })}
                          placeholder="Header text (max 60 chars)"
                          maxLength={60}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Body <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={form.components.body.text}
                      onChange={(e) => patchComponents({ body: { ...form.components.body, text: e.target.value } })}
                      placeholder={"Hello {{1}},\n\nYour booking is confirmed for {{2}}.\n\nThank you for choosing us!"}
                      rows={5}
                      maxLength={1024}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Use {"{{1}}, {{2}}"} etc. for variables. {form.components.body.text.length}/1024
                    </p>

                    {/* Variable examples */}
                    {varCountBody > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-medium text-gray-600">Example values for Meta review:</p>
                        {[...Array(varCountBody)].map((_, idx) => (
                          <input
                            key={idx}
                            value={form.components.body.examples?.[idx] ?? ""}
                            onChange={(e) => {
                              const examples = [...(form.components.body.examples ?? [])];
                              examples[idx] = e.target.value;
                              patchComponents({ body: { ...form.components.body, examples } });
                            }}
                            placeholder={`Value for {{${idx + 1}}}`}
                            className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Footer <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      value={form.components.footer?.text ?? ""}
                      onChange={(e) => patchComponents({ footer: e.target.value ? { text: e.target.value } : undefined })}
                      placeholder="e.g. Reply STOP to unsubscribe"
                      maxLength={60}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>

                  {/* Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buttons <span className="text-gray-400 font-normal">(optional, max 10)</span></label>
                    <ButtonEditor
                      buttons={form.components.buttons ?? []}
                      onChange={(b) => patchComponents({ buttons: b })}
                    />
                  </div>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}
                </div>

                {/* Preview — hidden on small screens, shown on lg */}
                <div className="hidden lg:flex w-72 shrink-0 flex-col border-l border-gray-100 bg-gray-50">
                  <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    Preview
                  </p>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <WhatsAppPreview components={form.components} name={form.name} />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={closePanel}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#1B52A8] hover:bg-[#163f82] disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                {saving && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {saving ? "Submitting…" : editing ? "Update Template" : "Submit for Review"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────

function TemplateCard({
  template: t,
  syncing,
  onEdit,
  onDelete,
  onSync,
}: {
  template: Template;
  syncing:  boolean;
  onEdit:   () => void;
  onDelete: () => void;
  onSync:   () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D4] p-4 flex flex-col gap-3 hover:shadow-sm transition group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-[#0C1B33] truncate">{t.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t.language}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[t.category]}`}>
            {t.category}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
            {t.status}
          </span>
        </div>
      </div>

      {/* Body preview */}
      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
        {t.components.body?.text || <span className="italic text-gray-400">No body text</span>}
      </p>

      {/* Rejection reason */}
      {t.status === "REJECTED" && t.rejectionReason && (
        <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600">
          <span className="font-medium">Reason: </span>{t.rejectionReason}
        </div>
      )}

      {/* Buttons preview */}
      {(t.components.buttons?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.components.buttons!.map((b, i) => (
            <span key={i} className="text-[10px] border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
              {b.text}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-50 -mx-1">
        <button
          onClick={onEdit}
          className="flex-1 text-xs text-gray-600 hover:text-[#1B52A8] py-1.5 px-2 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex-1 text-xs text-gray-600 hover:text-emerald-700 py-1.5 px-2 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync
        </button>
        <button
          onClick={onDelete}
          className="flex-1 text-xs text-gray-600 hover:text-red-600 py-1.5 px-2 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
