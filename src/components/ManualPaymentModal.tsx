"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatMinor, toMinor, toMajorInput } from "@/lib/money";

/**
 * Report an offline payment (bank transfer / UPI / cash / cheque).
 *
 * THIS FORM SUBMITS A CLAIM, NOT A PAYMENT. Nothing here settles an invoice —
 * the server always creates the record as PENDING and a Vaketta admin verifies
 * it against the bank before it becomes money. The copy says so plainly, so a
 * hotel never leaves this screen believing its subscription is already renewed.
 *
 * The amount is capped client-side purely as a courtesy; the server re-derives
 * the outstanding balance and rejects anything above it regardless.
 */

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT/IMPS/RTGS)" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
] as const;

/** Cash has nothing to reference; everything else needs a traceable id. */
const REFERENCE_OPTIONAL = new Set(["CASH"]);

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROOF = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type PayableInvoice = {
  id: string;
  number: string;
  currency: string;
  total: number;
  amountPaid: number;
};

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] " +
  "outline-none transition focus:border-[#1B52A8] focus:ring-2 focus:ring-[#1B52A8]/20";

export default function ManualPaymentModal({
  invoice,
  onClose,
  onSubmitted,
}: {
  invoice: PayableInvoice;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);

  const [method, setMethod] = useState<string>("BANK_TRANSFER");
  const [amount, setAmount] = useState(toMajorInput(outstanding, invoice.currency));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const referenceRequired = !REFERENCE_OPTIONAL.has(method);

  function pickProof(file: File | null) {
    setError("");
    if (!file) return setProof(null);
    if (!ALLOWED_PROOF.includes(file.type)) {
      return setError("Proof must be a JPEG, PNG or WebP image, or a PDF.");
    }
    if (file.size > MAX_PROOF_BYTES) {
      return setError("Proof must be 10 MB or smaller.");
    }
    setProof(file);
  }

  async function submit() {
    setError("");

    const minor = toMinor(amount, invoice.currency);
    if (!Number.isFinite(minor) || minor <= 0) return setError("Enter a valid amount.");
    if (minor > outstanding) {
      return setError(`That is more than the ${formatMinor(outstanding, invoice.currency)} outstanding.`);
    }
    if (referenceRequired && !reference.trim()) {
      return setError("A transaction reference (UTR / cheque number) is required.");
    }

    setBusy(true);
    try {
      // multipart so the optional proof rides along in one request; apiFetch
      // omits Content-Type for FormData so the browser sets the boundary.
      const form = new FormData();
      form.append("amount", String(minor));
      form.append("method", method);
      form.append("claimedPaidAt", paidAt);
      if (reference.trim()) form.append("reference", reference.trim());
      if (notes.trim()) form.append("notes", notes.trim());
      if (proof) form.append("proof", proof);

      await apiFetch(`/hotel-settings/billing/invoices/${invoice.id}/manual-payment`, {
        method: "POST",
        body: form,
      });

      onSubmitted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-base font-bold text-[#0C1B33]">Report a payment</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/50">
            {invoice.number} · {formatMinor(outstanding, invoice.currency)} outstanding
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Sets expectations before anything is typed. */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            We&apos;ll verify this against our bank records before it&apos;s applied. Your invoice stays
            open until it&apos;s confirmed.
          </div>

          <div>
            <label htmlFor="mp-method" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Payment method
            </label>
            <select id="mp-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mp-amount" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Amount ({invoice.currency})
            </label>
            <input
              id="mp-amount" type="number" min="0" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} className={inputCls}
            />
            <p className="mt-1 text-[11px] text-[#0C1B33]/45">
              Partial payments are accepted. Maximum {formatMinor(outstanding, invoice.currency)}.
            </p>
          </div>

          <div>
            <label htmlFor="mp-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Date paid
            </label>
            <input
              id="mp-date" type="date" value={paidAt} max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaidAt(e.target.value)} className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="mp-ref" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Reference{" "}
              <span className="font-normal normal-case text-slate-400">
                {referenceRequired ? "(UTR / cheque no.)" : "(optional for cash)"}
              </span>
            </label>
            <input
              id="mp-ref" type="text" value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder={referenceRequired ? "e.g. UTR123456789" : "Optional"} className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="mp-proof" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Proof <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="mp-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => pickProof(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-[#0C1B33]/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#F4F2ED] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0C1B33]"
            />
            <p className="mt-1 text-[11px] text-[#0C1B33]/45">Screenshot or PDF receipt, up to 10 MB.</p>
          </div>

          <div>
            <label htmlFor="mp-notes" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">
              Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <textarea
              id="mp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className={inputCls} placeholder="Anything that helps us match this payment"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm text-[#0C1B33]/70 transition hover:bg-[#F4F2ED]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-semibold text-white transition hover:bg-[#164389] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
