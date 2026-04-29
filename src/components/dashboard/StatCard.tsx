import type { StatWithTrend } from "@/types/dashboard";

type StatCardProps = {
  title: string;
  subtitle?: string;
  stat: StatWithTrend;
  formatValue?: (n: number) => string;
  trendLabel?: string;
};

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="text-xs font-medium text-[#0C1B33]/40">
        —
      </span>
    );
  }
  const positive = trend > 0;
  const zero = trend === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        zero
          ? "bg-slate-100 text-slate-500"
          : positive
            ? "bg-emerald-100 text-emerald-800"
            : "bg-rose-100 text-rose-800"
      }`}
    >
      {!zero && (positive ? "↑" : "↓")}
      {zero ? "0%" : `${positive ? "+" : ""}${trend}%`}
    </span>
  );
}

export default function StatCard({
  title,
  subtitle,
  stat,
  formatValue = (n) => n.toLocaleString(),
  trendLabel = "vs prior period",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#E5E0D4] bg-white p-3 sm:p-5 shadow-sm ring-1 ring-black/2">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/45 leading-tight">
        {title}
      </p>
      <div className="mt-2 sm:mt-3 flex flex-wrap items-end justify-between gap-1">
        <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#0C1B33]">
          {formatValue(stat.value)}
        </p>
        <TrendBadge trend={stat.trendPercent} />
      </div>
      {subtitle && (
        <p className="mt-1 text-[10px] sm:text-xs text-[#0C1B33]/40 hidden sm:block">{subtitle}</p>
      )}
      <p className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-[#0C1B33]/30 leading-tight">{trendLabel}</p>
    </div>
  );
}
