"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, getCurrencySymbol } from "@/lib/locale";

const BRAND   = "#1B52A8";   // Royal blue — line stroke
const ACCENT  = "#B8912E";   // Warm gold  — gradient top

type Point = { date: string; revenue: number };

function formatShortDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RevenueLineChart({ data }: { data: Point[] }) {
  return (
    <div className="h-70 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
              <stop offset="100%" stopColor={BRAND}  stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0C1B33" opacity={0.06} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.55 }}
            axisLine={{ stroke: "#0C1B33", opacity: 0.10 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => {
              const n = Number(v);
              const sym = getCurrencySymbol();
              if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
              if (n >= 1000)   return `${sym}${(n / 1000).toFixed(0)}k`;
              return `${sym}${n}`;
            }}
            tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.55 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E5E0D4",
              boxShadow: "0 8px 24px rgba(12,27,51,0.08)",
              background: "#fff",
            }}
            labelFormatter={(label) => formatShortDate(String(label))}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={BRAND}
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            dot={{ fill: BRAND, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: ACCENT }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
