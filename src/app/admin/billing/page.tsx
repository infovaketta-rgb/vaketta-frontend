"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { formatMinor } from "@/lib/money";
import { statusMeta } from "@/lib/subscriptionStatus";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

/** MRR is per-currency: a { INR: 249900, USD: 4900 } map of minor units. */
type CurrencyTotals = Record<string, number>;

type Analytics = {
  mrr:            CurrencyTotals;
  paidHotels:     CurrencyTotals;
  currencies:     string[];
  activeHotels:   number;
  trialHotels:    number;
  pastDueHotels:  number;
  expiredHotels:  number;
  canceledHotels: number;
  conversations:  number;
  aiReplies:      number;
  mrrHistory:     { month: string; totals: CurrencyTotals }[];
  usageHistory:   { month: string; conversations: number; aiReplies: number }[];
};

type HotelRow = {
  id:                 string;
  name:               string;
  subscriptionStatus: string;
  plan:               { name: string; priceMonthly: number; currency?: string } | null;
  subscription:       { planName: string; price: number; currency: string; endDate: string | null; autoRenew: boolean } | null;
  usage:              { conversationsUsed: number; aiRepliesUsed: number };
  _count:             { users: number; bookings: number; guests: number };
};

type HotelsPayload = { data: HotelRow[]; total: number; page: number; pages: number };

const STATUS_FILTERS = ["", "ACTIVE", "TRIALING", "PAST_DUE", "EXPIRED", "CANCELED"] as const;

// Line colours per currency series — brand palette, cycled.
const SERIES_COLORS = ["#1B52A8", "#B8912E", "#7A3F91", "#2B0D3E", "#0C1B33"];

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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BillingDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [hotels,    setHotels]    = useState<HotelRow[]>([]);
  const [pages,     setPages]     = useState(1);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [status,    setStatus]    = useState<string>("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const loadHotels = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    const h: HotelsPayload = await adminApiFetch(`/admin/hotels-billing?${params}`);
    setHotels(h.data ?? []);
    setPages(h.pages ?? 1);
    setTotal(h.total ?? 0);
  }, [page, status]);

  useEffect(() => {
    adminApiFetch("/admin/analytics")
      .then(setAnalytics)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    // setLoading lives inside the async body: calling it synchronously in the
    // effect triggers a cascading render (react-hooks/set-state-in-effect).
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadHotels();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadHotels]);

  if (!analytics && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1B52A8] border-t-transparent" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const a = analytics!;
  const currencies = a.currencies?.length ? a.currencies : Object.keys(a.mrr ?? {});

  // One chart series per currency. The old chart summed mixed currencies into a
  // single "USD" line, which was not a number that meant anything.
  const mrrChartData = (a.mrrHistory ?? []).map((row) => {
    const point: Record<string, string | number> = { month: row.month };
    for (const cur of currencies) point[cur] = +((row.totals[cur] ?? 0) / 100).toFixed(2);
    return point;
  });

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Billing &amp; Revenue</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">
          Platform-wide MRR, usage, and hotel subscription overview.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* MRR — one card per currency. Summing INR and USD into a single "$"
          figure, as this page used to, produced a meaningless number. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {currencies.length === 0 ? (
          <KpiCard label="Monthly Recurring Revenue" value="—" sub="No paid subscriptions yet" valueClass="text-[#0C1B33]/40" />
        ) : (
          currencies.map((cur) => (
            <KpiCard
              key={cur}
              label={`MRR · ${cur}`}
              value={formatMinor(a.mrr[cur] ?? 0, cur, { compact: true })}
              sub={`${a.paidHotels?.[cur] ?? 0} paying hotel${(a.paidHotels?.[cur] ?? 0) === 1 ? "" : "s"}`}
              valueClass="text-[#B8912E]"
            />
          ))
        )}
        <KpiCard
          label="Hotels"
          value={String(a.activeHotels)}
          sub={`${a.trialHotels} trial · ${a.pastDueHotels} past due · ${a.expiredHotels} expired`}
          valueClass="text-emerald-600"
        />
        <KpiCard
          label="Conversations (this month)"
          value={a.conversations.toLocaleString()}
          sub="Incoming conversation windows"
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
          <h2 className="mb-1 text-sm font-semibold text-[#0C1B33]">Invoiced Revenue Over Time</h2>
          <p className="mb-4 text-xs text-[#0C1B33]/45">
            Total invoiced per month, one line per currency
          </p>
          {mrrChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[#0C1B33]/40">No billing history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={280}>
                <LineChart data={mrrChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D4" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} />
                  <YAxis tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.5 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #E5E0D4", boxShadow: "0 4px 16px rgba(12,27,51,0.08)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {currencies.map((cur, i) => (
                    <Line
                      key={cur}
                      type="monotone"
                      dataKey={cur}
                      name={cur}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-[#0C1B33]">Usage Growth</h2>
          <p className="mb-4 text-xs text-[#0C1B33]/45">Conversations and AI replies by month</p>
          {(a.usageHistory ?? []).length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[#0C1B33]/40">No usage history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={280}>
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
            </div>
          )}
        </div>
      </div>

      {/* Hotel subscriptions table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0C1B33]">Hotel Subscriptions</h2>
            <p className="mt-0.5 text-xs text-[#0C1B33]/45">
              Prices come from each hotel&rsquo;s subscription snapshot, not the current plan
            </p>
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-[#E5E0D4] bg-white px-3 py-1.5 text-sm text-[#0C1B33] focus:border-[#1B52A8] focus:outline-none"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "" ? "All statuses" : statusMeta(s).label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Hotel", "Plan", "Price /mo", "Status", "Renews", "Conversations", "AI Replies", "Guests"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-[#0C1B33]/40">Loading…</td></tr>
              ) : hotels.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-[#0C1B33]/40">No hotels found</td></tr>
              ) : hotels.map((h) => {
                const meta = statusMeta(h.subscriptionStatus);
                const planName = h.subscription?.planName ?? h.plan?.name ?? null;
                const price    = h.subscription?.price ?? h.plan?.priceMonthly ?? null;
                const currency = h.subscription?.currency ?? h.plan?.currency ?? null;
                return (
                  <tr key={h.id} className="transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3.5 font-semibold text-[#0C1B33]">{h.name}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70">
                      {planName ?? <span className="italic text-[#0C1B33]/40">No plan</span>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#B8912E] tabular-nums">
                      {price !== null
                        ? formatMinor(price, currency, { compact: true })
                        : <span className="font-normal text-[#0C1B33]/35">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#0C1B33]/60">
                      {h.subscription?.endDate
                        ? `${fmtDate(h.subscription.endDate)}${h.subscription.autoRenew ? "" : " (ends)"}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70 tabular-nums">{h.usage.conversationsUsed.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70 tabular-nums">{h.usage.aiRepliesUsed.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[#0C1B33]/70 tabular-nums">{h._count.guests.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* This table used to be hard-capped at 20 rows with no way to see the rest. */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E0D4] px-6 py-3 text-sm">
            <span className="text-[#0C1B33]/50">
              Page {page} of {pages} · {total} hotel{total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-[#0C1B33]/70 transition hover:bg-[#F4F2ED] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-[#0C1B33]/70 transition hover:bg-[#F4F2ED] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
