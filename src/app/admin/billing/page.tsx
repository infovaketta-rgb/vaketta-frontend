"use client";

import { useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type Analytics = {
  mrr:           number;
  activeHotels:  number;
  trialHotels:   number;
  expiredHotels: number;
  conversations: number;
  aiReplies:     number;
  mrrHistory:    { month: string; mrr: number }[];
  usageHistory:  { month: string; conversations: number; aiReplies: number }[];
};

type HotelRow = {
  id:                 string;
  name:               string;
  subscriptionStatus: string;
  plan:               { name: string; priceMonthly: number; currency?: string } | null;
  usage:              { conversationsUsed: number; aiRepliesUsed: number };
  _count:             { users: number; bookings: number; guests: number };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ",
  SAR: "﷼", SGD: "S$", MYR: "RM", AUD: "A$", CAD: "C$",
  JPY: "¥", THB: "฿", IDR: "Rp", PHP: "₱", LKR: "Rs",
};

function planPriceDisplay(minor: number, currency = "USD"): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${sym}${(minor / 100).toLocaleString("en", { minimumFractionDigits: 0 })}`;
}

function statusStyle(s: string) {
  if (s === "active")  return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (s === "trial")   return "text-blue-700 bg-blue-50 border-blue-200";
  if (s === "expired") return "text-red-600 bg-red-50 border-red-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, valueClass }: {
  label:      string;
  value:      string;
  sub?:       string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E0D4] bg-white px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/45">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#0C1B33]/40">{sub}</p>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BillingDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [hotels,    setHotels]    = useState<HotelRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    Promise.all([
      adminApiFetch("/admin/analytics"),
      adminApiFetch("/admin/hotels-billing?limit=20"),
    ])
      .then(([a, h]) => { setAnalytics(a); setHotels(h.data ?? []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1B52A8] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const a = analytics!;
  const mrrChartData = a.mrrHistory.map((r) => ({ month: r.month, MRR: +(r.mrr / 100).toFixed(2) }));

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Billing & Revenue</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">Platform-wide MRR, usage, and hotel subscription overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Monthly Recurring Revenue"
          value={`$${(a.mrr / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          sub="From active subscriptions"
          valueClass="text-[#B8912E]"
        />
        <KpiCard
          label="Active Hotels"
          value={String(a.activeHotels)}
          sub={`${a.trialHotels} trial · ${a.expiredHotels} expired`}
          valueClass="text-emerald-600"
        />
        <KpiCard
          label="Conversations (this month)"
          value={a.conversations.toLocaleString()}
          sub="Incoming messages tracked"
          valueClass="text-[#1B52A8]"
        />
        <KpiCard
          label="AI Replies (this month)"
          value={a.aiReplies.toLocaleString()}
          sub="Bot responses sent"
          valueClass="text-slate-700"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-[#0C1B33]">MRR Over Time</h2>
          <p className="mb-4 text-xs text-[#0C1B33]/45">Monthly recurring revenue in USD</p>
          {mrrChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[#0C1B33]/40">No billing history yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mrrChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} />
                <YAxis tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v) => [`$${v ?? 0}`, "MRR"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #E5E0D4", boxShadow: "0 4px 16px rgba(12,27,51,0.08)" }}
                />
                <Line type="monotone" dataKey="MRR" stroke="#1B52A8" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#1B52A8", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#B8912E" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-[#0C1B33]">Usage Growth</h2>
          <p className="mb-4 text-xs text-[#0C1B33]/45">Conversations and AI replies by month</p>
          {a.usageHistory.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[#0C1B33]/40">No usage history yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={a.usageHistory} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} />
                <YAxis tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E0D4", boxShadow: "0 4px 16px rgba(12,27,51,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="conversations" name="Conversations" fill="#1B52A8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aiReplies"     name="AI Replies"    fill="#B8912E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hotel subscriptions table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Hotel Subscriptions</h2>
          <p className="mt-0.5 text-xs text-[#0C1B33]/45">Plan prices shown in each plan's billing currency</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Hotel", "Plan", "Price /mo", "Status", "Conversations", "AI Replies", "Guests"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {hotels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#0C1B33]/40">No hotels found</td>
                </tr>
              ) : hotels.map((h) => (
                <tr key={h.id} className="transition hover:bg-[#F4F2ED]/60">
                  <td className="px-5 py-3.5 font-semibold text-[#0C1B33]">{h.name}</td>
                  <td className="px-5 py-3.5 text-[#0C1B33]/70">
                    {h.plan?.name ?? <span className="italic text-[#0C1B33]/40">No plan</span>}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#B8912E] font-mono">
                    {h.plan
                      ? planPriceDisplay(h.plan.priceMonthly, h.plan.currency)
                      : <span className="text-[#0C1B33]/35 font-sans font-normal">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle(h.subscriptionStatus)}`}>
                      {h.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#0C1B33]/70">{h.usage.conversationsUsed.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-[#0C1B33]/70">{h.usage.aiRepliesUsed.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-[#0C1B33]/70">{h._count.guests.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
