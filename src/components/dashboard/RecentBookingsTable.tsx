import type { DashboardPayload } from "@/types/dashboard";
import { formatCurrency, formatDate as fmtDate } from "@/lib/locale";

type Row = DashboardPayload["recentBookings"][number];

const statusStyles: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-800 ring-amber-200/60",
  HOLD:      "bg-sky-100 text-sky-800 ring-sky-200/60",
  CONFIRMED: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
  CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200/60",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200/60";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}


export default function RecentBookingsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E0D4] bg-[#F4F2ED] px-6 py-12 text-center text-sm text-[#0C1B33]/45">
        No bookings yet. New bookings will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E0D4] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E0D4] bg-[#F4F2ED] text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/50">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Room type</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D4]">
            {rows.map((b) => (
              <tr
                key={b.id}
                className="transition hover:bg-[#F4F2ED]/60"
              >
                <td className="px-4 py-3 font-medium text-[#0C1B33]">
                  {b.guestName}
                </td>
                <td className="px-4 py-3 text-[#0C1B33]/75">{b.roomTypeName}</td>
                <td className="px-4 py-3 text-[#0C1B33]/65">
                  {fmtDate(b.checkIn)}
                </td>
                <td className="px-4 py-3 text-[#0C1B33]/65">
                  {fmtDate(b.checkOut)}
                </td>
                <td className="px-4 py-3 font-semibold text-[#B8912E]">
                  {formatCurrency(b.totalPrice)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
