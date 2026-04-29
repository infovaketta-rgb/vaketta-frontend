"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { getCurrencySymbol } from "@/lib/locale";

// ── Types ──────────────────────────────────────────────────────────────────────

type Plan = {
  id:                      string;
  name:                    string;
  currency:                string;
  priceMonthly:            number; // minor units
  conversationLimit:       number;
  aiReplyLimit:            number;
  extraConversationCharge: number; // minor units per extra
  extraAiReplyCharge:      number; // minor units per extra
};

type Snapshot = {
  planName:               string;
  currency?:              string;
  price:                  number;
  conversationLimit:      number;
  aiReplyLimit:           number;
  extraConversationCharge: number;
  extraAiReplyCharge:     number;
  startDate:              string;
  endDate:                string | null;
};

type Subscription = {
  status:           string;
  billingStartDate: string | null;
  billingEndDate:   string | null;
  plan:             Plan | null;
  snapshot:         Snapshot | null;
};

type Usage = {
  conversationsUsed: number;
  aiRepliesUsed:     number;
  month:             string;
};

type UsageHistoryRow = {
  month:             string;
  conversations?:    number;
  conversationsUsed?: number;
  aiReplies?:        number;
  aiRepliesUsed?:    number;
};

type UsageHistory = UsageHistoryRow[];

// ── Helpers ────────────────────────────────────────────────────────────────────

function minorToDisplay(amount: number, currency?: string | null) {
  const sym = getCurrencySymbol(currency);
  return `${sym}${(amount / 100).toFixed(2)}`;
}

function limitDisplay(n: number) {
  return n === 0 ? "Unlimited" : n.toLocaleString();
}

function pct(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function statusStyle(s: string) {
  if (s === "active")  return { pill: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Active" };
  if (s === "trial")   return { pill: "text-blue-700 bg-blue-50 border-blue-200",          label: "Trial" };
  if (s === "expired") return { pill: "text-red-600 bg-red-50 border-red-200",             label: "Expired" };
  return { pill: "text-slate-500 bg-slate-50 border-slate-200", label: s };
}

function rowConversations(r: UsageHistoryRow): number {
  return r.conversations ?? r.conversationsUsed ?? 0;
}

function rowAiReplies(r: UsageHistoryRow): number {
  return r.aiReplies ?? r.aiRepliesUsed ?? 0;
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, color }: {
  label: string;
  used:  number;
  limit: number;
  color: string;
}) {
  const percentage = pct(used, limit);
  const isUnlimited = limit === 0;
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

function PlanCard({
  plan,
  snapshot,
  status,
  billingStartDate,
  billingEndDate,
}: {
  plan:             Plan | null;
  snapshot:         Snapshot | null;
  status:           string;
  billingStartDate: string | null;
  billingEndDate:   string | null;
}) {
  const { pill, label } = statusStyle(status);
  const currency = snapshot?.currency ?? plan?.currency;
  const display = snapshot ?? (plan ? {
    planName:          plan.name,
    price:             plan.priceMonthly,
    conversationLimit: plan.conversationLimit,
    aiReplyLimit:      plan.aiReplyLimit,
    startDate:         billingStartDate ?? "",
    endDate:           billingEndDate,
  } : null);

  return (
    <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
      <div className="border-b border-[#E5E0D4] bg-linear-to-r from-[#F4F2ED] to-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0C1B33]">Current Subscription</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/50">Your active plan and billing cycle.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${pill}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {label}
        </span>
      </div>

      <div className="px-6 py-5">
        {!display ? (
          <div className="text-center py-6 text-[#0C1B33]/40">
            <p className="text-sm">No active subscription.</p>
            <p className="text-xs mt-1">Contact your account manager to get started.</p>
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
                {minorToDisplay(display.price, currency)}
                <span className="text-sm font-normal text-[#0C1B33]/40">/mo</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Billing Period</p>
              <p className="text-sm text-[#0C1B33]/75">
                {fmtDate(display.startDate)} → {fmtDate(display.endDate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#0C1B33]/40 font-medium uppercase tracking-wide">Includes</p>
              <p className="text-sm text-[#0C1B33]/75">
                {limitDisplay(display.conversationLimit)} conversations · {limitDisplay(display.aiReplyLimit)} AI replies
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

  const [sub,     setSub]     = useState<Subscription | null>(null);
  const [usage,   setUsage]   = useState<Usage | null>(null);
  const [history, setHistory] = useState<UsageHistory>([]);
  const [plans,   setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch("/hotel-settings/billing/subscription"),
      apiFetch("/hotel-settings/billing/usage"),
      apiFetch("/hotel-settings/billing/plans"),
    ])
      .then(([s, u, p]) => {
        setSub(s);
        setUsage(u.current);
        setHistory(u.history ?? []);
        setPlans(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1B52A8] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 402 — backend blocked all API calls; show a static expired screen
  if (error.toLowerCase().includes("expired")) {
    return (
      <div className="p-8 max-w-xl">
        <div className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-6 py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-red-800">Subscription Expired</h2>
            <p className="text-sm text-red-600">
              Your hotel's subscription has expired. All automated features are currently paused.
            </p>
          </div>
          <div className="px-6 py-7 text-center space-y-4">
            <p className="text-sm text-[#0C1B33]/65">
              To restore access and resume operations, contact your account manager to renew.
            </p>
            <a
              href="mailto:support@vaketta.com"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B52A8] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#163F82] transition"
            >
              Contact Support
            </a>
            <p className="text-xs text-[#0C1B33]/35">support@vaketta.com</p>
          </div>
        </div>
      </div>
    );
  }

  const subCurrency  = sub?.snapshot?.currency ?? sub?.plan?.currency;
  const convLimit    = sub?.snapshot?.conversationLimit       ?? sub?.plan?.conversationLimit       ?? 0;
  const aiLimit      = sub?.snapshot?.aiReplyLimit            ?? sub?.plan?.aiReplyLimit            ?? 0;
  const convOverRate = sub?.snapshot?.extraConversationCharge ?? sub?.plan?.extraConversationCharge ?? 0;
  const aiOverRate   = sub?.snapshot?.extraAiReplyCharge      ?? sub?.plan?.extraAiReplyCharge      ?? 0;

  const convUsed = usage?.conversationsUsed ?? 0;
  const aiUsed   = usage?.aiRepliesUsed     ?? 0;

  const convOver    = convLimit > 0 ? Math.max(0, convUsed - convLimit) : 0;
  const aiOver      = aiLimit   > 0 ? Math.max(0, aiUsed   - aiLimit)   : 0;
  const overageCost = convOver * convOverRate + aiOver * aiOverRate;

  return (
    <div className="p-8 space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Subscription & Usage</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">Your current plan, billing cycle, and monthly usage.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Plan card */}
      {sub && (
        <PlanCard
          plan={sub.plan}
          snapshot={sub.snapshot}
          status={sub.status}
          billingStartDate={sub.billingStartDate}
          billingEndDate={sub.billingEndDate}
        />
      )}

      {/* Usage card */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-linear-to-r from-[#F4F2ED] to-white px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Usage This Month</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/50">
            {usage?.month ?? "—"} · Resets at the start of each billing cycle.
          </p>
        </div>
        <div className="px-6 py-5 space-y-6">
          <UsageBar label="Conversations" used={convUsed} limit={convLimit} color="bg-[#1B52A8]" />
          <UsageBar label="AI Replies"    used={aiUsed}   limit={aiLimit}   color="bg-[#B8912E]" />

          {/* Overage rates */}
          {(convOverRate > 0 || aiOverRate > 0) && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700">Overage Charges</p>
              <div className="flex flex-wrap gap-4 text-xs text-amber-600">
                {convOverRate > 0 && (
                  <span>+{convOver.toLocaleString()} conv × {minorToDisplay(convOverRate, subCurrency)} = <strong>{minorToDisplay(convOver * convOverRate, subCurrency)}</strong></span>
                )}
                {aiOverRate > 0 && (
                  <span>+{aiOver.toLocaleString()} AI replies × {minorToDisplay(aiOverRate, subCurrency)} = <strong>{minorToDisplay(aiOver * aiOverRate, subCurrency)}</strong></span>
                )}
              </div>
              {overageCost > 0 && (
                <p className="text-xs font-bold text-amber-800 pt-1 border-t border-amber-200">
                  Estimated overage: {minorToDisplay(overageCost, subCurrency)} this cycle
                </p>
              )}
            </div>
          )}
        </div>
      </div>

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
                    <td className="px-5 py-3 text-[#0C1B33]/70">{rowConversations(r).toLocaleString()}</td>
                    <td className="px-5 py-3 text-[#0C1B33]/70">{rowAiReplies(r).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available plans (upgrade prompt) */}
      {plans.length > 0 && sub?.status !== "active" && (
        <div className="rounded-2xl border border-[#1B52A8]/15 bg-blue-50 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0C1B33]">Available Plans</h2>
            <p className="text-xs text-[#0C1B33]/50 mt-0.5">Contact your account manager to upgrade.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={p.id} className="rounded-xl bg-white border border-[#E5E0D4] shadow-sm px-4 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#0C1B33] text-sm">{p.name}</p>
                  <p className="text-[#B8912E] font-bold text-sm">
                    {minorToDisplay(p.priceMonthly, p.currency)}
                    <span className="text-xs text-[#0C1B33]/40 font-normal">/mo</span>
                  </p>
                </div>
                <p className="text-xs text-[#0C1B33]/55">{limitDisplay(p.conversationLimit)} conversations · {limitDisplay(p.aiReplyLimit)} AI replies</p>
                {(p.extraConversationCharge > 0 || p.extraAiReplyCharge > 0) && (
                  <p className="text-[11px] text-[#0C1B33]/40">
                    Overage: {p.extraConversationCharge > 0 ? `${minorToDisplay(p.extraConversationCharge, p.currency)}/conv` : ""}
                    {p.extraConversationCharge > 0 && p.extraAiReplyCharge > 0 ? " · " : ""}
                    {p.extraAiReplyCharge > 0 ? `${minorToDisplay(p.extraAiReplyCharge, p.currency)}/reply` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#0C1B33]/50 italic">To upgrade, contact <strong>support@vaketta.com</strong>.</p>
        </div>
      )}
    </div>
  );
}
