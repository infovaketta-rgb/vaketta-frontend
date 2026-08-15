"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";
import { formatMinor, toMinor, toMajorInput } from "@/lib/money";

/**
 * Invoices and payments.
 *
 * Nothing like this existed: billing was entirely manual with no record of what
 * a hotel owed or what had been collected, and `extraConversationCharge` /
 * `extraAiReplyCharge` were snapshotted onto every subscription but never
 * charged by any code path.
 */

type Payment = {
  id:         string;
  amount:     number;
  currency:   string;
  method:     string;
  reference:  string | null;
  receivedAt: string;
};

type Invoice = {
  id:           string;
  number:       string;
  status:       "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
  currency:     string;
  subtotal:     number;
  overageTotal: number;
  total:        number;
  amountPaid:   number;
  periodStart:  string;
  periodEnd:    string;
  dueAt:        string;
  paidAt:       string | null;
  hotel:        { id: string; name: string };
  payments:     Payment[];
};

type Payload = { data: Invoice[]; total: number; page: number; pages: number };

const STATUS_FILTERS = ["", "OPEN", "PAID", "VOID", "UNCOLLECTIBLE"] as const;

const STATUS_BADGE: Record<Invoice["status"], string> = {
  PAID:          "text-emerald-700 bg-emerald-50 border-emerald-200",
  OPEN:          "text-amber-700 bg-amber-50 border-amber-200",
  DRAFT:         "text-slate-600 bg-slate-50 border-slate-200",
  VOID:          "text-slate-500 bg-slate-50 border-slate-200",
  UNCOLLECTIBLE: "text-red-600 bg-red-50 border-red-200",
};

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(inv: Invoice): boolean {
  return inv.status === "OPEN" && new Date(inv.dueAt).getTime() < Date.now();
}

export default function AdminInvoicesPage() {
  const [rows,    setRows]    = useState<Invoice[]>([]);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState<string>("OPEN");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("manual_bank_transfer");
  const [payRef,    setPayRef]    = useState("");
  const [paying,    setPaying]    = useState(false);
  const [payError,  setPayError]  = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) params.set("status", status);
    const res: Payload = await adminApiFetch(`/admin/invoices?${params}`);
    setRows(res.data ?? []);
    setPages(res.pages ?? 1);
    setTotal(res.total ?? 0);
  }, [page, status]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  function openPayment(inv: Invoice) {
    setPayTarget(inv);
    // Default to the outstanding balance — the common case is "paid in full".
    setPayAmount(toMajorInput(Math.max(0, inv.total - inv.amountPaid), inv.currency));
    setPayMethod("manual_bank_transfer");
    setPayRef("");
    setPayError("");
  }

  async function recordPayment() {
    if (!payTarget) return;
    setPaying(true);
    setPayError("");
    try {
      await adminApiFetch(`/admin/invoices/${payTarget.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: toMinor(payAmount, payTarget.currency),
          method: payMethod,
          reference: payRef.trim() || undefined,
        }),
      });
      setPayTarget(null);
      await load();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Failed to record payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Invoices</h1>
          <p className="mt-1 text-sm text-[#0C1B33]/50">
            Issued automatically at each renewal. Record payments here as they clear.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] focus:border-[#1B52A8] focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "" ? "All statuses" : s[0]! + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Invoice", "Hotel", "Period", "Subtotal", "Overage", "Total", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-[#0C1B33]/40">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-[#0C1B33]/40">No invoices found.</td></tr>
              ) : rows.map((inv) => (
                <tr key={inv.id} className="transition hover:bg-[#F4F2ED]/60">
                  <td className="px-5 py-3.5 font-mono text-xs text-[#0C1B33]">{inv.number}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/hotels/${inv.hotel.id}`} className="font-medium text-[#1B52A8] hover:underline">
                      {inv.hotel.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#0C1B33]/60">
                    {fmtDate(inv.periodStart)} → {fmtDate(inv.periodEnd)}
                  </td>
                  <td className="px-5 py-3.5 text-[#0C1B33]/70 tabular-nums">{formatMinor(inv.subtotal, inv.currency)}</td>
                  <td className="px-5 py-3.5 tabular-nums">
                    {inv.overageTotal > 0
                      ? <span className="text-amber-700">{formatMinor(inv.overageTotal, inv.currency)}</span>
                      : <span className="text-[#0C1B33]/30">—</span>}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#B8912E] tabular-nums">
                    {formatMinor(inv.total, inv.currency)}
                    {inv.amountPaid > 0 && inv.amountPaid < inv.total && (
                      <span className="ml-1 text-[11px] font-normal text-[#0C1B33]/45">
                        ({formatMinor(inv.amountPaid, inv.currency)} paid)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status]}`}>
                      {inv.status === "OPEN"
                        ? isOverdue(inv) ? `Overdue ${fmtDate(inv.dueAt)}` : `Due ${fmtDate(inv.dueAt)}`
                        : inv.status[0]! + inv.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {inv.status === "OPEN" && (
                      <button
                        onClick={() => openPayment(inv)}
                        className="rounded-lg bg-[#1B52A8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#163F82]"
                      >
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E0D4] px-6 py-3 text-sm">
            <span className="text-[#0C1B33]/50">Page {page} of {pages} · {total} invoices</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-[#0C1B33]/70 transition hover:bg-[#F4F2ED] disabled:opacity-40">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-[#0C1B33]/70 transition hover:bg-[#F4F2ED] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Record payment modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPayTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Record Payment</h2>
              <p className="mt-0.5 text-xs text-[#0C1B33]/50">
                {payTarget.number} · {payTarget.hotel.name}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED] px-4 py-3 text-xs text-[#0C1B33]/70">
                Total {formatMinor(payTarget.total, payTarget.currency)} ·{" "}
                Outstanding <strong>{formatMinor(payTarget.total - payTarget.amountPaid, payTarget.currency)}</strong>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                  Amount ({payTarget.currency})
                </label>
                <input type="number" min="0" step="0.01" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls}>
                  <option value="manual_bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                  Reference <span className="font-normal normal-case text-slate-400">(UTR / cheque no.)</span>
                </label>
                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Optional" className={inputCls} />
              </div>
              {payError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{payError}</div>}
              <div className="flex gap-2">
                <button onClick={() => setPayTarget(null)}
                  className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 transition hover:bg-[#F4F2ED]">Cancel</button>
                <button onClick={recordPayment} disabled={paying}
                  className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white transition hover:bg-[#163F82] disabled:opacity-60">
                  {paying ? "Recording…" : "Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
