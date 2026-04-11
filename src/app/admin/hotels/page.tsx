"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";
import { logAdminAction } from "@/lib/adminAudit";
import { SkeletonRow } from "@/components/admin/SkeletonRow";
import { useMounted } from "@/lib/useMounted";

interface Hotel {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  _count: { users: number; guests: number; bookings: number };
}

const PAGE_SIZE = 20;

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

export default function AdminHotelsPage() {
  const mounted = useMounted();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Hotel | null>(null);
  const [deleting, setDeleting] = useState(false);

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

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });

    adminApiFetch(`/admin/hotels?${params}`)
      .then((res: any) => {
        if (cancelled) return;
        setHotels(res.hotels ?? []);
        setTotal(res.total ?? 0);
        setPages(res.pages ?? 1);
      })
      .catch((e: any) => { if (cancelled || e.message === "Unauthorized") return; setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mounted, page, debouncedSearch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await adminApiFetch("/admin/hotels", {
        method: "POST",
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });
      logAdminAction("hotel.create", { name: newName, phone: newPhone });
      setShowCreate(false);
      setNewName("");
      setNewPhone("");
      setPage(1);
      setDebouncedSearch(debouncedSearch);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApiFetch(`/admin/hotels/${deleteTarget.id}`, { method: "DELETE" });
      logAdminAction("hotel.delete", { id: deleteTarget.id, name: deleteTarget.name });
      setDeleteTarget(null);
      setHotels((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      setTotal((t) => t - 1);
    } catch (e: any) {
      setError(e.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Hotels</h1>
          {!loading && (
            <p className="mt-1 text-sm text-[#0C1B33]/50">{total.toLocaleString()} hotel{total !== 1 ? "s" : ""} registered</p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Hotel
        </button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0C1B33]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search hotels by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E5E0D4] bg-white pl-9 pr-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Name", "Phone", "Users", "Bookings", "Guests", "Joined", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-3 ${["Users","Bookings","Guests"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : hotels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#0C1B33]/40">
                    {debouncedSearch ? `No hotels matching "${debouncedSearch}"` : "No hotels yet."}
                  </td>
                </tr>
              ) : (
                hotels.map((h) => (
                  <tr key={h.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3.5 font-semibold">
                      <Link href={`/admin/hotels/${h.id}`} className="text-[#1B52A8] hover:underline">
                        {h.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/60">{h.phone}</td>
                    <td className="px-5 py-3.5 text-right text-[#0C1B33]/70">{h._count.users}</td>
                    <td className="px-5 py-3.5 text-right text-[#0C1B33]/70">{h._count.bookings}</td>
                    <td className="px-5 py-3.5 text-right text-[#0C1B33]/70">{h._count.guests}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/55">{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDeleteTarget(h)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E0D4] bg-[#F4F2ED]/50 px-5 py-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33]/70 disabled:opacity-40 hover:bg-white transition"
            >
              ← Prev
            </button>
            <span className="text-xs text-[#0C1B33]/50">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33]/70 disabled:opacity-40 hover:bg-white transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Create Hotel Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">New Hotel</h2>
            </div>
            {createError && (
              <div className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Hotel Name</label>
                <input required value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="e.g. Maadathil Cottages" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">WhatsApp Phone (with country code)</label>
                <input required value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={inputCls} placeholder="e.g. 918606113495" />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(""); }}
                  className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white hover:bg-[#163F82] disabled:opacity-60 transition"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-bold text-[#0C1B33]">Delete Hotel?</h2>
            <p className="mb-5 text-sm text-[#0C1B33]/65">
              This will permanently delete <span className="font-semibold">{deleteTarget.name}</span> and all its data — staff, guests, bookings, and messages. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-700 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
