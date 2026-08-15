"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";

/**
 * Server-side audit trail.
 *
 * Replaces `lib/adminAudit.ts`, which was a `console.info` stub whose own
 * comment said "extend to POST /admin/audit-log when backend is ready" — and
 * which the money-touching actions (assign plan, start trial) never even called,
 * while renaming a hotel did. Nothing was recorded anywhere.
 */

type AuditRow = {
  id:        string;
  category:  string;
  type:      string;
  actorType: string;
  actorId:   string | null;
  hotelId:   string | null;
  data:      Record<string, unknown> | null;
  createdAt: string;
};

type Payload = { data: AuditRow[]; total: number; page: number; pages: number };

const CATEGORIES = ["", "billing", "hotel", "admin"] as const;

/** Colour by blast radius — money events should stand out from routine ones. */
const TYPE_TONE: { match: RegExp; cls: string }[] = [
  { match: /^plan\.(created|updated)$/,        cls: "text-[#B8912E] bg-[#B8912E]/10 border-[#B8912E]/25" },
  { match: /^plan\.assigned$/,                 cls: "text-[#1B52A8] bg-[#1B52A8]/8 border-[#1B52A8]/25" },
  { match: /^(invoice|payment)\./,             cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { match: /^subscription\.(expired|canceled|past_due)$/, cls: "text-red-600 bg-red-50 border-red-200" },
  { match: /^notice\./,                        cls: "text-slate-600 bg-slate-50 border-slate-200" },
];

function typeClass(type: string): string {
  return TYPE_TONE.find((t) => t.match.test(type))?.cls ?? "text-[#0C1B33]/70 bg-[#F4F2ED] border-[#E5E0D4]";
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Render the JSON payload as compact key=value pairs rather than raw JSON. */
function summarise(data: Record<string, unknown> | null): string {
  if (!data) return "";
  return Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("  ·  ");
}

export default function AuditLogPage() {
  const [rows,     setRows]     = useState<AuditRow[]>([]);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [category, setCategory] = useState<string>("billing");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (category) params.set("category", category);
    const res: Payload = await adminApiFetch(`/admin/audit-log?${params}`);
    setRows(res.data ?? []);
    setPages(res.pages ?? 1);
    setTotal(res.total ?? 0);
  }, [page, category]);

  useEffect(() => {
    // setLoading lives inside the async body: calling it synchronously in the
    // effect triggers a cascading render (react-hooks/set-state-in-effect).
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Audit Log</h1>
          <p className="mt-1 text-sm text-[#0C1B33]/50">
            Every plan change, subscription transition, invoice and payment — recorded server-side.
          </p>
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] focus:border-[#1B52A8] focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === "" ? "All categories" : c[0]!.toUpperCase() + c.slice(1)}</option>
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
                {["When", "Event", "Actor", "Hotel", "Details"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#0C1B33]/40">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#0C1B33]/40">No events recorded yet.</td></tr>
              ) : rows.map((r) => {
                const details = summarise(r.data);
                const isOpen = expanded === r.id;
                return (
                  <tr key={r.id} className="align-top transition hover:bg-[#F4F2ED]/60">
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-[#0C1B33]/55 tabular-nums">{fmtWhen(r.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${typeClass(r.type)}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#0C1B33]/60">
                      {r.actorType === "SYSTEM" ? (
                        <span className="italic text-[#0C1B33]/40">system</span>
                      ) : (
                        <span className="font-mono">{r.actorId?.slice(0, 8) ?? "admin"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {r.hotelId ? (
                        <Link href={`/admin/hotels/${r.hotelId}`} className="font-mono text-[#1B52A8] hover:underline">
                          {r.hotelId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-[#0C1B33]/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#0C1B33]/60">
                      {details ? (
                        <button
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className={`text-left hover:text-[#0C1B33] ${isOpen ? "" : "line-clamp-1"}`}
                          title="Toggle full details"
                        >
                          {details}
                        </button>
                      ) : (
                        <span className="text-[#0C1B33]/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E0D4] px-6 py-3 text-sm">
            <span className="text-[#0C1B33]/50">Page {page} of {pages} · {total} events</span>
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
