"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";
import type { FlowSummary } from "@/app/dashboard/bot/flows/types";

export default function AdminFlowsPage() {
  const mounted = useMounted();
  const router  = useRouter();

  const [flows,   setFlows]   = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [creating, setCreating] = useState(false);

  // New flow form state
  const [showForm,   setShowForm]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newDesc,    setNewDesc]    = useState("");
  const [newTemplate, setNewTemplate] = useState(false);
  const [newHotelId,  setNewHotelId]  = useState<string>("");

  useEffect(() => {
    if (!mounted) return;
    adminApiFetch("/admin/flows")
      .then(setFlows)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const flow: FlowSummary = await adminApiFetch("/admin/flows", {
        method: "POST",
        body: JSON.stringify({
          name:       newName.trim(),
          description: newDesc.trim() || undefined,
          isTemplate:  newTemplate,
          hotelId:    newHotelId || null,
        }),
      });
      router.push(`/admin/flows/${flow.id}`);
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  }

  async function toggleActive(flow: FlowSummary) {
    try {
      const updated: FlowSummary = await adminApiFetch(`/admin/flows/${flow.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !flow.isActive }),
      });
      setFlows((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this flow? This cannot be undone.")) return;
    try {
      await adminApiFetch(`/admin/flows/${id}`, { method: "DELETE" });
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!mounted) return null;

  const inputCls = "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

  return (
    <div className="p-8 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Flows</h1>
          <p className="mt-1 text-sm text-[#0C1B33]/50">
            Build visual WhatsApp conversation flows. Global templates are visible to all hotels.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Flow
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* New flow form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">New Flow</h2>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Name *</label>
                <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Guest Check-in Flow" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Description</label>
                <input className={inputCls} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Hotel ID (leave blank for global)</label>
              <input className={inputCls} value={newHotelId} onChange={(e) => setNewHotelId(e.target.value)} placeholder="hotel UUID — leave empty for global template" />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNewTemplate((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${newTemplate ? "bg-[#1B52A8]" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${newTemplate ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm text-[#0C1B33]/70">Mark as global template (visible to all hotels)</span>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={creating} className="rounded-xl bg-[#1B52A8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163F82] disabled:opacity-50">
                {creating ? "Creating…" : "Create & Edit"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#E5E0D4] px-5 py-2.5 text-sm text-[#0C1B33]/70 transition hover:bg-[#F4F2ED]">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Flows table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E5E0D4] border-t-[#1B52A8]" />
          </div>
        ) : flows.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#0C1B33]/40">No flows yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold text-[#0C1B33]/50 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Hotel</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {flows.map((flow) => (
                <tr key={flow.id} className="transition hover:bg-[#F4F2ED]/60">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-[#0C1B33]">{flow.name}</p>
                    {flow.description && <p className="text-xs text-[#0C1B33]/40 mt-0.5">{flow.description}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#0C1B33]/55">
                    {flow.hotel?.name ?? <span className="italic text-[#0C1B33]/25">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {flow.isTemplate ? (
                      <span className="rounded-full bg-[#B8912E]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#B8912E]">Global Template</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">Hotel Private</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => toggleActive(flow)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${flow.isActive ? "bg-[#1B52A8]" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flow.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => router.push(`/admin/flows/${flow.id}`)}
                      className="rounded-lg border border-[#E5E0D4] px-2.5 py-1 text-xs font-medium text-[#1B52A8] transition hover:bg-[#1B52A8]/5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
