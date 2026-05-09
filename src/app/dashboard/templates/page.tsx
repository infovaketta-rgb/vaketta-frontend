"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { useMounted } from "@/lib/useMounted";

// ── Types ──────────────────────────────────────────────────────────────────────

type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
type TemplateStatus   = "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED";

interface ButtonDef {
  type:    "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
  text:    string;
  url?:    string;
  phone?:  string;
  example?: string;
}

interface Components {
  header?:  { type: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"; text?: string; mediaUrl?: string };
  body:     { text: string; examples?: string[] };
  footer?:  { text: string };
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

const META_TEMPLATES_URL = "https://business.facebook.com/wa/manage/message-templates/";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const mounted = useMounted();
  const { addToast } = useToastStore();

  const [templates, setTemplates]       = useState<Template[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState<TemplateCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<TemplateStatus | "">("");

  // Delete confirmation
  const [deleting, setDeleting] = useState<string | null>(null);

  // Syncing individual template
  const [syncing, setSyncing] = useState<string | null>(null);

  // Sync-from-Meta bulk import
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat)     params.set("category", filterCat);
      if (filterStatus)  params.set("status",   filterStatus);
      if (search.trim()) params.set("search",   search.trim());
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, filterCat, filterStatus]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  // ── Sync single ───────────────────────────────────────────────────────────────

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

  // ── Sync from Meta ───────────────────────────────────────────────────────────

  async function handleSyncFromMeta() {
    setIsSyncing(true);
    try {
      const result = await apiFetch("/hotel-templates/sync-from-meta", { method: "POST" });
      const { created, updated, skipped } = result.summary as { created: number; updated: number; skipped: number };
      const parts: string[] = [];
      if (created) parts.push(`${created} new`);
      if (updated) parts.push(`${updated} updated`);
      if (skipped) parts.push(`${skipped} skipped`);
      addToast(`Synced: ${parts.join(", ") || "nothing changed"}`, "success");
      await load();
    } catch (err: any) {
      addToast(err.message ?? "Sync from Meta failed", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  if (!mounted) return null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#F4F2ED]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0C1B33]">WhatsApp Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage approved templates for proactive guest outreach.</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Sync from Meta */}
            <button
              onClick={handleSyncFromMeta}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 border border-[#7A3F91] text-[#7A3F91] hover:bg-[#7A3F91]/8 disabled:opacity-50 text-sm font-medium rounded-xl transition"
            >
              {isSyncing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isSyncing ? "Syncing…" : "Sync from Meta"}
            </button>

            {/* Create Template — opens Meta Business Manager */}
            <a
              href={META_TEMPLATES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1B52A8] hover:bg-[#163f82] text-white text-sm font-medium rounded-xl transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Create in Meta
            </a>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-400 text-right leading-snug max-w-xs">
            Create your template in Meta Business Manager, then click{" "}
            <span className="font-medium text-[#7A3F91]">Sync from Meta</span> to import it here.
          </p>
        </div>
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
          {(["PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"] as TemplateStatus[]).map((s) =>
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
            <a
              href={META_TEMPLATES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1B52A8] hover:underline flex items-center gap-1"
            >
              Create your first template in Meta Business Manager
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                syncing={syncing === t.id}
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
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────

function TemplateCard({
  template: t,
  syncing,
  onDelete,
  onSync,
}: {
  template: Template;
  syncing:  boolean;
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
          onClick={onSync}
          disabled={syncing}
          className="flex-1 text-xs text-gray-600 hover:text-emerald-700 py-1.5 px-2 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? "Syncing…" : "Sync"}
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
