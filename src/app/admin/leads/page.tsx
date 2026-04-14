"use client";

import { useEffect, useRef, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  hotelName: string;
  country: string;
  planId: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["all", "new", "contacted", "converted", "rejected"] as const;

const STATUS_BADGE: Record<string, string> = {
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-emerald-100 text-emerald-700",
  rejected:  "bg-red-100 text-red-600",
};

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

const PAGE_SIZE = 20;

export default function AdminLeadsPage() {
  const mounted = useMounted();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit modal
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Create hotel modal
  const [createFrom, setCreateFrom] = useState<Lead | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    adminApiFetch(`/admin/leads?${params}`)
      .then((res) => {
        if (cancelled) return;
        setLeads(res.data ?? []);
        setTotal(res.total ?? 0);
        setPages(res.pages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load leads");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mounted, page, statusFilter, debouncedSearch]);

  function openEdit(lead: Lead) {
    setEditing(lead);
    setEditStatus(lead.status);
    setEditNotes(lead.notes ?? "");
    setSaveError("");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await adminApiFetch(`/admin/leads/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      });
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditing(null);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function openCreateHotel(lead: Lead) {
    setCreateFrom(lead);
    setNewPhone(lead.phone);
    setCreateError("");
  }

  async function handleCreateHotel() {
    if (!createFrom) return;
    setCreating(true);
    setCreateError("");
    try {
      await adminApiFetch("/admin/hotels", {
        method: "POST",
        body: JSON.stringify({ name: createFrom.hotelName, phone: newPhone }),
      });
      // Mark lead as converted
      const updated = await adminApiFetch(`/admin/leads/${createFrom.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "converted" }),
      });
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setCreateFrom(null);
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create hotel");
    } finally {
      setCreating(false);
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Leads</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} total lead{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Search name, email, hotel, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? "bg-[#0C1B33] text-white"
                  : "bg-[#F4F2ED] text-slate-500 hover:bg-[#E5E0D4]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D4] bg-white shadow-sm">
        {error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 hidden lg:table-cell">Phone</th>
                <th className="px-4 py-3 hidden lg:table-cell">Country</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F4F2ED]/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0C1B33]">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.hotelName}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{lead.phone}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{lead.country || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[lead.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell whitespace-nowrap">{fmt(lead.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(lead)}
                          className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#0C1B33] hover:text-[#0C1B33]"
                        >
                          Edit
                        </button>
                        {lead.status !== "converted" && (
                          <button
                            onClick={() => openCreateHotel(lead)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Create hotel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-[#F4F2ED] disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-[#F4F2ED] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-[#0C1B33]">Edit Lead</h2>

            <div className="mb-2 space-y-0.5 rounded-lg bg-[#F4F2ED] p-3 text-sm">
              <p className="font-semibold text-[#0C1B33]">{editing.name} — {editing.hotelName}</p>
              <p className="text-slate-500">{editing.email} · {editing.phone}</p>
              {editing.message && (
                <p className="mt-2 italic text-slate-500">"{editing.message}"</p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className={inputCls}
                >
                  {["new", "contacted", "converted", "rejected"].map((s) => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Internal notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes visible only to admins…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-xs text-red-500">{saveError}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-[#E5E0D4] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-[#F4F2ED] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#0C1B33] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1B52A8] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create hotel modal ──────────────────────────────────────────────── */}
      {createFrom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-[#0C1B33]">Create Hotel Account</h2>
            <p className="mb-4 text-sm text-slate-500">This will create a hotel for this lead and mark it as converted.</p>

            <div className="mb-4 space-y-0.5 rounded-lg bg-[#F4F2ED] p-3 text-sm">
              <p className="font-semibold text-[#0C1B33]">{createFrom.hotelName}</p>
              <p className="text-slate-500">{createFrom.name} · {createFrom.email}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Hotel name
                </label>
                <input
                  type="text"
                  readOnly
                  value={createFrom.hotelName}
                  className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  WhatsApp phone number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">Must be the hotel's registered WhatsApp Business number.</p>
              </div>
            </div>

            {createError && (
              <p className="mt-3 text-xs text-red-500">{createError}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setCreateFrom(null)}
                className="rounded-lg border border-[#E5E0D4] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-[#F4F2ED] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHotel}
                disabled={creating || !newPhone.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create hotel →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
