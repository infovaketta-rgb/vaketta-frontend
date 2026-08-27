"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { formatMinor } from "@/lib/money";

/**
 * Manual payment review queue.
 *
 * The human verification step that stands between a hotel CLAIMING it paid and
 * Vaketta treating that as money. Nothing on this page settles anything
 * directly: Approve and Reject both POST to the existing
 * `/admin/payments/:id/transition`, which runs `transitionPayment` — the same
 * function every other settlement goes through.
 *
 * The reviewer's job is to match the reference/UTR and proof against the actual
 * bank statement. Everything a hotel typed is displayed as an unverified claim,
 * never as fact — which is why the claimed date and reference are labelled as
 * "claimed" rather than presented as record.
 */

type Payment = {
  id: string;
  hotelId: string;
  invoiceId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  currency: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  claimedPaidAt: string | null;
  proofUrl: string | null;
  failureReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  receivedAt: string;
  hotel: { id: string; name: string } | null;
  invoice: {
    id: string;
    number: string;
    total: number;
    amountPaid: number;
    status: string;
  } | null;
};

const STATUS_BADGE: Record<Payment["status"], string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  SUCCEEDED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  FAILED: "text-red-600 bg-red-50 border-red-200",
  REFUNDED: "text-slate-600 bg-slate-50 border-slate-200",
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
  manual_bank_transfer: "Bank transfer (admin)",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUSES = ["PENDING", "SUCCEEDED", "FAILED", ""] as const;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** id of the payment currently being approved/rejected. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (status) params.set("status", status);
      const res = await adminApiFetch(`/admin/payments?${params.toString()}`);
      setPayments(res?.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(payment: Payment, next: "SUCCEEDED" | "FAILED", reason?: string) {
    setBusyId(payment.id);
    setActionError("");
    try {
      await adminApiFetch(`/admin/payments/${payment.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status: next, ...(reason ? { failureReason: reason } : {}) }),
      });
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (e) {
      // A refusal here is meaningful — most often "the invoice was already
      // paid", i.e. this claim was superseded and should be rejected instead.
      setActionError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Payments</h1>
          <p className="mt-1 text-sm text-[#0C1B33]/50">
            Verify reported offline payments against the bank before approving. Approving credits the
            invoice and restores service.
          </p>
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] outline-none focus:border-[#1B52A8]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s[0]! + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#0C1B33]/40">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E0D4] bg-white py-16 text-center text-sm text-[#0C1B33]/50">
          {status === "PENDING" ? "No payments waiting for review." : "No payments found."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E5E0D4] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED]">
                <tr>
                  {["Hotel", "Invoice", "Amount", "Method", "Claimed paid", "Reference", "Proof", "Submitted", "Status", ""].map(
                    (h, i) => (
                      <th
                        key={h || `c${i}`}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D4]">
                {payments.map((p) => (
                  <tr key={p.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-4 py-3 font-medium text-[#0C1B33]">{p.hotel?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-[#0C1B33]">{p.invoice?.number ?? "—"}</div>
                      {p.invoice && (
                        <div className="mt-0.5 text-[11px] text-[#0C1B33]/45">
                          {formatMinor(p.invoice.total - p.invoice.amountPaid, p.currency)} outstanding ·{" "}
                          {p.invoice.status}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#0C1B33]">
                      {formatMinor(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#0C1B33]/70">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-[#0C1B33]/70">{fmtDate(p.claimedPaidAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#0C1B33]/70">{p.reference || "—"}</td>
                    <td className="px-4 py-3">
                      {p.proofUrl ? (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-[#1B52A8] underline underline-offset-2"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-[#0C1B33]/35">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#0C1B33]/60">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}
                      >
                        {p.status === "PENDING" ? "Under review" : p.status[0]! + p.status.slice(1).toLowerCase()}
                      </span>
                      {p.failureReason && (
                        <div className="mt-1 max-w-[200px] text-[11px] text-red-600">{p.failureReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Only a PENDING claim is actionable — an approved payment
                          is immutable, which transitionPayment enforces anyway. */}
                      {p.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => transition(p, "SUCCEEDED")}
                            disabled={busyId !== null}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyId === p.id ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(p);
                              setRejectReason("");
                              setActionError("");
                            }}
                            disabled={busyId !== null}
                            className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-semibold text-[#0C1B33]/70 transition hover:bg-[#F4F2ED] disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject modal — a reason is mandatory so the decision is auditable and
          the hotel can be told what to fix. */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setRejectTarget(null)}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
              <h2 className="text-base font-bold text-[#0C1B33]">Reject payment</h2>
              <p className="mt-0.5 text-xs text-[#0C1B33]/50">
                {rejectTarget.hotel?.name} · {formatMinor(rejectTarget.amount, rejectTarget.currency)}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label htmlFor="reject-reason" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
                  Reason
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. No matching credit found for this UTR"
                  className="w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-sm outline-none focus:border-[#1B52A8]"
                />
                <p className="mt-1 text-[11px] text-[#0C1B33]/45">
                  Recorded on the payment and visible to the hotel.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 transition hover:bg-[#F4F2ED]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => transition(rejectTarget, "FAILED", rejectReason.trim())}
                  disabled={busyId !== null || !rejectReason.trim()}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
