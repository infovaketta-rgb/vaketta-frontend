"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { openRazorpayCheckout, type CheckoutHandlerPayload } from "@/lib/razorpay";
import ManualPaymentModal, { type PayableInvoice } from "@/components/ManualPaymentModal";
import { formatMinor, formatRate, formatLimit } from "@/lib/money";
import { statusMeta, daysUntil, normalizeStatus } from "@/lib/subscriptionStatus";

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = {
  id:                      string;
  name:                    string;
  currency:                string;
  country?:                string;
  priceMonthly:            number; // minor units
  conversationLimit:       number;
  aiReplyLimit:            number;
  extraConversationCharge: number; // minor units per extra
  extraAiReplyCharge:      number; // minor units per extra
};

type Snapshot = {
  planName:                string;
  currency:                string;
  price:                   number;
  conversationLimit:       number;
  aiReplyLimit:            number;
  extraConversationCharge: number;
  extraAiReplyCharge:      number;
  startDate:               string;
  endDate:                 string | null;
  autoRenew:               boolean;
};

type ScheduledPlan = {
  id:           string;
  name:         string;
  currency:     string;
  priceMonthly: number;
};

type Subscription = {
  status:           string;
  billingStartDate: string | null;
  /** EXCLUSIVE period boundary — never render this as the end date. */
  billingEndDate:   string | null;
  periodStart:      string | null;
  periodEnd:        string | null;
  /** Last instant of the period — this is what an end date should show. */
  periodEndInclusive: string | null;
  billingAnchorDay: number | null;
  trialConverted:   boolean;
  trialEndsAt:      string | null;
  scheduledPlan:    ScheduledPlan | null;
  trialMessage:     string | null;
  plan:             Plan | null;
  snapshot:         Snapshot | null;
};

type Overage = {
  conversationOverage: number;
  aiReplyOverage:      number;
  conversationCharge:  number;
  aiReplyCharge:       number;
  total:               number;
};

type UsagePeriod = {
  periodStart:        string;
  periodEnd:          string;
  periodEndInclusive: string;
  month:              string;
};

type UsagePayload = {
  current:  { conversationsUsed: number; aiRepliesUsed: number; month: string };
  history:  { month: string; conversationsUsed: number; aiRepliesUsed: number }[];
  overage:  Overage;
  /** The billing period usage is metered into. Absent on older responses. */
  period?:  UsagePeriod | null;
  currency: string | null;
  limits:   { conversations: number; aiReplies: number } | null;
};

/** A payment the hotel has reported or that has been recorded against it. */
type HotelPayment = {
  id:             string;
  invoiceId:      string;
  status:         "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  currency:       string;
  amount:         number;
  method:         string;
  reference:      string | null;
  claimedPaidAt:  string | null;
  failureReason:  string | null;
  createdAt:      string;
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
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Format a period's EXCLUSIVE end as the inclusive last day people expect.
 *
 * Periods are stored half-open: 15 Aug → 15 Sep means "through 14 Sep". Showing
 * the raw boundary made a monthly cycle look like it ran into the next one, and
 * an anchor-15 subscription read as "15 Aug → 15 Sep" rather than "→ 14 Sep".
 *
 * Subtracting 1ms rather than a whole day is deliberate: the boundary is
 * midnight in the platform's billing timezone, and the last instant before it
 * formats to the correct calendar day in the viewer's zone too.
 */
export function fmtPeriodEnd(exclusiveIso: string | null): string {
  if (!exclusiveIso) return "—";
  const end = new Date(exclusiveIso);
  if (Number.isNaN(end.getTime())) return "—";
  return fmtDate(new Date(end.getTime() - 1).toISOString());
}

const INVOICE_BADGE: Record<Invoice["status"], string> = {
  PAID:          "text-emerald-700 bg-emerald-50 border-emerald-200",
  OPEN:          "text-amber-700 bg-amber-50 border-amber-200",
  DRAFT:         "text-slate-600 bg-slate-50 border-slate-200",
  VOID:          "text-slate-500 bg-slate-50 border-slate-200",
  UNCOLLECTIBLE: "text-red-600 bg-red-50 border-red-200",
};

// ── Progress Bar ───────────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, color }: {
  label: string;
  used:  number;
  limit: number;
  color: string;
}) {
  const percentage  = pct(used, limit);
  const isUnlimited = limit <= 0;
  const isWarning   = !isUnlimited && percentage >= 80;
  const barColor    = isWarning ? "bg-amber-500" : color;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#0C1B33]">{label}</span>
        <span className={`text-xs font-semibold ${isWarning ? "text-amber-600" : "text-[#0C1B33]/50"}`}>
          {isUnlimited
            ? `${used.toLocaleString()} used (Unlimited)`
            : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#F4F2ED] overflow-hidden">
        {isUnlimited ? (
          <div className={`h-full w-4 rounded-full ${color} opacity-40`} />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {!isUnlimited && (
        <p className={`text-xs ${isWarning ? "text-amber-600 font-medium" : "text-[#0C1B33]/35"}`}>
          {isWarning ? `⚠️ ${percentage}% used` : `${percentage}% used`}
        </p>
      )}
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────────────────

function PlanCard({ sub }: { sub: Subscription }) {
  const meta = statusMeta(sub.status);

  // The snapshot is what the hotel is actually billed for this cycle — a later
  // edit to the Plan must not change it. Fall back to the live plan only when
  // there is no snapshot at all.
  const snapshot = sub.snapshot;
  const currency = snapshot?.currency ?? sub.plan?.currency ?? null;

  const display = snapshot
    ? {
        planName:          snapshot.planName,
        price:             snapshot.price,
        conversationLimit: snapshot.conversationLimit,
        aiReplyLimit:      snapshot.aiReplyLimit,
        startDate:         snapshot.startDate,
        endDate:           snapshot.endDate,
        autoRenew:         snapshot.autoRenew,
      }
    : sub.plan
      ? {
          planName:          sub.plan.name,
          price:             sub.plan.priceMonthly,
          conversationLimit: sub.plan.conversationLimit,
          aiReplyLimit:      sub.plan.aiReplyLimit,
          startDate:         sub.billingStartDate ?? "",
          endDate:           sub.billingEndDate,
          autoRenew:         true,
        }
      : null;

  const remaining = daysUntil(display?.endDate ?? null);

  return (
    <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
      <div className="border-b border-[#E5E0D4] bg-linear-to-r from-[#F4F2ED] to-white px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#0C1B33]">Current Subscription</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/50">Your active plan and billing cycle.</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${meta.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="px-6 py-5">
        {!display ? (
          <div className="text-center py-6 text-[#0C1B33]/40">
            <p className="text-sm">No active subscription.</p>
            <p className="text-xs mt-1">Choose a plan below to get started.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Plan</p>
              <p className="text-lg font-bold text-[#0C1B33]">{display.planName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Monthly Price</p>
              <p className="text-lg font-bold text-[#0C1B33]">
                {formatMinor(display.price, currency)}
                <span className="text-sm font-normal text-[#0C1B33]/40">/mo</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Current Period</p>
              {/* The stored end is EXCLUSIVE; render the inclusive last day, so
                  an anchor-15 cycle reads "15 Aug → 14 Sep", not "→ 15 Sep". */}
              <p className="text-sm text-[#0C1B33]/75">
                {fmtDate(display.startDate)} → {fmtPeriodEnd(display.endDate)}
              </p>
              {remaining !== null && remaining >= 0 && (
                <p className="text-xs text-[#0C1B33]/45">
                  {remaining === 0 ? "Ends today" : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}
                  {display.autoRenew ? " · renews automatically" : " · does not renew"}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Includes</p>
              <p className="text-sm text-[#0C1B33]/75">
                {formatLimit(display.conversationLimit)} conversations · {formatLimit(display.aiReplyLimit)} AI replies
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const mounted = useMounted();

  const [sub,      setSub]      = useState<Subscription | null>(null);
  const [usage,    setUsage]    = useState<UsagePayload | null>(null);
  const [plans,    setPlans]    = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<HotelPayment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  // Razorpay: which invoice is mid-payment, and any payment-specific message.
  // Kept separate from `error` so a failed payment never blanks the page.
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState("");
  const [payNotice, setPayNotice] = useState("");

  // Manual/offline payment. Separate from the Razorpay state: the two are
  // independent routes to settling the same invoice and must not share a
  // "busy" flag, or opening one would appear to disable the other.
  const [manualTarget, setManualTarget] = useState<PayableInvoice | null>(null);

  /** Re-pull billing data after a payment so status/invoices reflect it. */
  const refreshBilling = useCallback(async () => {
    const [s, u, i, pay] = await Promise.allSettled([
      apiFetch("/hotel-settings/billing/subscription"),
      apiFetch("/hotel-settings/billing/usage"),
      apiFetch("/hotel-settings/billing/invoices"),
      apiFetch("/hotel-settings/billing/payments"),
    ]);
    if (s.status === "fulfilled") setSub(s.value);
    if (u.status === "fulfilled") setUsage(u.value);
    if (i.status === "fulfilled") setInvoices(i.value ?? []);
    if (pay.status === "fulfilled") setPayments(pay.value ?? []);
  }, []);

  /**
   * Pay an OPEN invoice.
   *
   * The browser never sends an amount — the server derives it from the
   * invoice — and never decides the payment succeeded: the signed handler
   * payload goes back for verification, and the webhook settles independently.
   */
  const handlePay = useCallback(async (invoice: Invoice) => {
    setPayError("");
    setPayNotice("");
    setPayingId(invoice.id);

    try {
      const order = await apiFetch(
        `/hotel-settings/billing/invoices/${invoice.id}/razorpay-order`,
        { method: "POST", body: JSON.stringify({}) },
      );

      const opened = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        invoiceNumber: order.invoiceNumber,
        onSuccess: async (payload: CheckoutHandlerPayload) => {
          try {
            const result = await apiFetch("/hotel-settings/billing/razorpay/verify", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            setPayNotice(
              result?.status === "already_processed"
                ? "This payment was already recorded."
                : "Payment received — thank you.",
            );
            await refreshBilling();
          } catch (err: any) {
            // The webhook is authoritative, so a failed callback verification
            // does NOT mean the money was lost — say so rather than alarming.
            setPayError(
              err?.message ??
                "We could not confirm the payment immediately. It will be updated shortly.",
            );
            await refreshBilling();
          } finally {
            setPayingId(null);
          }
        },
        onDismiss: () => {
          // Closing the modal is neither success nor failure.
          setPayingId(null);
        },
      });

      if (!opened) {
        setPayError("Could not load the payment window. Check your connection and try again.");
        setPayingId(null);
      }
    } catch (err: any) {
      setPayError(err?.message ?? "Could not start the payment.");
      setPayingId(null);
    }
  }, [refreshBilling]);

  useEffect(() => {
    if (!mounted) return;

    // allSettled, not all: one failing endpoint used to blank the entire page,
    // so a broken /plans call hid the customer's own plan and usage too.
    Promise.allSettled([
      apiFetch("/hotel-settings/billing/subscription"),
      apiFetch("/hotel-settings/billing/usage"),
      apiFetch("/hotel-settings/billing/plans"),
      apiFetch("/hotel-settings/billing/invoices"),
      apiFetch("/hotel-settings/billing/payments"),
    ])
      .then(([s, u, p, i, pay]) => {
        if (s.status === "fulfilled") setSub(s.value);
        if (u.status === "fulfilled") setUsage(u.value);
        if (p.status === "fulfilled") setPlans(p.value ?? []);
        if (i.status === "fulfilled") setInvoices(i.value ?? []);
        if (pay.status === "fulfilled") setPayments(pay.value ?? []);

        const firstFailure = [s, u, p, i].find((r) => r.status === "rejected");
        if (s.status === "rejected" && firstFailure && "reason" in firstFailure) {
          setError(firstFailure.reason?.message ?? "Failed to load billing information.");
        }
      })
      .finally(() => setLoading(false));
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1B52A8] border-t-transparent animate-spin" />
      </div>
    );
  }

  // An invoice with a claim awaiting verification must not offer "pay again" —
  // that is how a hotel ends up paying twice while the first payment is still
  // being checked.
  const pendingByInvoice = new Map(
    payments.filter((p) => p.status === "PENDING").map((p) => [p.invoiceId, p]),
  );

  const status   = normalizeStatus(sub?.status);
  const meta     = statusMeta(sub?.status);
  const currency = usage?.currency ?? sub?.snapshot?.currency ?? sub?.plan?.currency ?? null;

  const convLimit = usage?.limits?.conversations ?? sub?.snapshot?.conversationLimit ?? 0;
  const aiLimit   = usage?.limits?.aiReplies     ?? sub?.snapshot?.aiReplyLimit      ?? 0;
  const convUsed  = usage?.current?.conversationsUsed ?? 0;
  const aiUsed    = usage?.current?.aiRepliesUsed     ?? 0;

  // Server-computed, from the same function that builds the invoice. This used
  // to be multiplied out in the browser and labelled an "estimate".
  const overage = usage?.overage;

  const convRate = sub?.snapshot?.extraConversationCharge ?? sub?.plan?.extraConversationCharge ?? 0;
  const aiRate   = sub?.snapshot?.extraAiReplyCharge      ?? sub?.plan?.extraAiReplyCharge      ?? 0;

  const history = usage?.history ?? [];

  return (
    <div className="p-8 space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Subscription &amp; Usage</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">Your current plan, billing cycle, and monthly usage.</p>
      </div>

      {/* Status notice. An expired hotel now reaches this page with LIVE data —
          the billing routes are exempt from the paywall — instead of the static
          "email support" screen it used to get. */}
      {meta.suspended && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5">
          <h2 className="text-sm font-bold text-red-800">
            {status === "CANCELED" ? "Subscription cancelled" : "Subscription expired"}
          </h2>
          <p className="mt-1 text-sm text-red-700">{meta.description}</p>
        </div>
      )}

      {status === "PAST_DUE" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <h2 className="text-sm font-bold text-amber-800">Payment overdue</h2>
          <p className="mt-1 text-sm text-amber-700">{meta.description}</p>
        </div>
      )}

      {/* A plan queued to take over the instant the trial ends. Shown so the
          customer knows there is no cut-off coming — the paid period starts on
          exactly the boundary the trial finishes on, with no gap. */}
      {status === "TRIALING" && sub?.scheduledPlan && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="text-sm font-bold text-emerald-800">
            {sub.scheduledPlan.name} starts when your trial ends
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            Your trial runs through <strong>{fmtPeriodEnd(sub.trialEndsAt)}</strong>. On{" "}
            <strong>{fmtDate(sub.trialEndsAt)}</strong> your{" "}
            {formatMinor(sub.scheduledPlan.priceMonthly, sub.scheduledPlan.currency)}/mo plan takes
            over automatically — your automation keeps running without interruption.
          </p>
        </div>
      )}

      {/* TrialConfig.trialMessage is admin-editable and labelled "shown on the
          Subscription page during trial" — but no endpoint had ever returned it. */}
      {status === "TRIALING" && sub?.trialMessage && !sub?.scheduledPlan && (
        <div className="rounded-2xl border border-[#1B52A8]/15 bg-blue-50 px-6 py-5">
          <h2 className="text-sm font-bold text-[#0C1B33]">You&rsquo;re on a free trial</h2>
          <p className="mt-1 text-sm text-[#0C1B33]/70">{sub.trialMessage}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Plan card */}
      {sub && <PlanCard sub={sub} />}

      {/* Usage card */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-linear-to-r from-[#F4F2ED] to-white px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Usage This Period</h2>
          {/* Usage buckets follow the BILLING period now, so this states the
              actual window rather than a calendar month that no longer matches
              it — the old copy promised a billing-cycle reset it did not do. */}
          <p className="mt-0.5 text-xs text-[#0C1B33]/50">
            {usage?.period
              ? `${fmtDate(usage.period.periodStart)} → ${fmtPeriodEnd(usage.period.periodEnd)} · Resets on your billing date.`
              : `${usage?.current?.month ?? "—"} · Resets at the start of each billing cycle.`}
          </p>
        </div>
        <div className="px-6 py-5 space-y-6">
          <UsageBar label="Conversations" used={convUsed} limit={convLimit} color="bg-[#1B52A8]" />
          <UsageBar label="AI Replies"    used={aiUsed}   limit={aiLimit}   color="bg-[#B8912E]" />

          {overage && overage.total > 0 && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700">Overage this cycle</p>
              <div className="flex flex-wrap gap-4 text-xs text-amber-600">
                {overage.conversationOverage > 0 && (
                  <span>
                    +{overage.conversationOverage.toLocaleString()} conv × {formatRate(convRate, currency)} ={" "}
                    <strong>{formatMinor(overage.conversationCharge, currency)}</strong>
                  </span>
                )}
                {overage.aiReplyOverage > 0 && (
                  <span>
                    +{overage.aiReplyOverage.toLocaleString()} AI replies × {formatRate(aiRate, currency)} ={" "}
                    <strong>{formatMinor(overage.aiReplyCharge, currency)}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-amber-800 pt-1 border-t border-amber-200">
                Total overage: {formatMinor(overage.total, currency)} — added to your next invoice
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment result — deliberately separate from the page-level error, so a
          declined card never blanks the billing page. */}
      {(payNotice || payError) && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            payError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {payError || payNotice}
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F2ED] border-b border-[#E5E0D4]">
                <tr>
                  {["Invoice", "Period", "Amount", "Status", ""].map((h, idx) => (
                    <th key={h || `col-${idx}`} className="px-5 py-3 text-left text-xs font-semibold text-[#0C1B33]/50 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D4]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F4F2ED]/60 transition">
                    <td className="px-5 py-3 font-mono text-xs text-[#0C1B33]">{inv.number}</td>
                    <td className="px-5 py-3 text-[#0C1B33]/70">
                      {fmtDate(inv.periodStart)} → {fmtPeriodEnd(inv.periodEnd)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#0C1B33] tabular-nums">
                      {formatMinor(inv.total, inv.currency)}
                      {inv.overageTotal > 0 && (
                        <span className="ml-1 text-xs font-normal text-[#0C1B33]/45">
                          (incl. {formatMinor(inv.overageTotal, inv.currency)} overage)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${INVOICE_BADGE[inv.status]}`}>
                        {inv.status === "OPEN" ? `Due ${fmtDate(inv.dueAt)}` : inv.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {/* Only an OPEN invoice with a balance is payable, and
                          only in INR while Razorpay is INR-only. */}
                      {inv.status === "OPEN" && pendingByInvoice.has(inv.id) && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Under review
                        </span>
                      )}
                      {inv.status === "OPEN" && inv.total > inv.amountPaid && !pendingByInvoice.has(inv.id) && (
                        <div className="flex items-center justify-end gap-2">
                          {/* Razorpay is INR-only in this stage; the offline
                              route works for every currency, so a non-INR
                              invoice still has a way to be paid. */}
                          {inv.currency === "INR" && (
                            <button
                              onClick={() => handlePay(inv)}
                              disabled={payingId !== null}
                              className="rounded-lg bg-[#1B52A8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#164389] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {payingId === inv.id ? "Opening…" : "Pay now"}
                            </button>
                          )}
                          <button
                            onClick={() => setManualTarget(inv)}
                            className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-semibold text-[#0C1B33]/70 transition hover:bg-[#F4F2ED]"
                          >
                            Report payment
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

      {manualTarget && (
        <ManualPaymentModal
          invoice={manualTarget}
          onClose={() => setManualTarget(null)}
          onSubmitted={() => {
            setPayError("");
            setPayNotice("Payment submitted for review. We'll confirm once it's verified.");
            void refreshBilling();
          }}
        />
      )}

      {/* Usage history */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">Usage History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F2ED] border-b border-[#E5E0D4]">
                <tr>
                  {["Month", "Conversations", "AI Replies"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#0C1B33]/50 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D4]">
                {[...history].reverse().map((r) => (
                  <tr key={r.month} className="hover:bg-[#F4F2ED]/60 transition">
                    <td className="px-5 py-3 font-medium text-[#0C1B33]">{r.month}</td>
                    <td className="px-5 py-3 text-[#0C1B33]/70 tabular-nums">{r.conversationsUsed.toLocaleString()}</td>
                    <td className="px-5 py-3 text-[#0C1B33]/70 tabular-nums">{r.aiRepliesUsed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available plans */}
      {plans.length > 0 && status !== "ACTIVE" && (
        <div className="rounded-2xl border border-[#1B52A8]/15 bg-blue-50 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0C1B33]">Available Plans</h2>
            <p className="text-xs text-[#0C1B33]/50 mt-0.5">Contact your account manager to switch plans.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={p.id} className="rounded-xl bg-white border border-[#E5E0D4] shadow-sm px-4 py-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#0C1B33] text-sm">{p.name}</p>
                  <p className="text-[#B8912E] font-bold text-sm whitespace-nowrap">
                    {formatMinor(p.priceMonthly, p.currency, { compact: true })}
                    <span className="text-xs text-[#0C1B33]/40 font-normal">/mo</span>
                  </p>
                </div>
                <p className="text-xs text-[#0C1B33]/55">
                  {formatLimit(p.conversationLimit)} conversations · {formatLimit(p.aiReplyLimit)} AI replies
                </p>
                {(p.extraConversationCharge > 0 || p.extraAiReplyCharge > 0) && (
                  <p className="text-[11px] text-[#0C1B33]/40">
                    Overage:{" "}
                    {[
                      p.extraConversationCharge > 0 ? `${formatRate(p.extraConversationCharge, p.currency)}/conv` : "",
                      p.extraAiReplyCharge > 0 ? `${formatRate(p.extraAiReplyCharge, p.currency)}/reply` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#0C1B33]/50 italic">
            To change plans, contact <strong>support@vaketta.com</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
