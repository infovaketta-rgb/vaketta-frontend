"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BAR       = "#1B52A8";   // Royal blue — bar fill
const BAR_HOVER = "#B8912E";   // Warm gold  — active bar

type Point = { date: string; count: number };

function formatShortDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function BookingsBarChart({ data }: { data: Point[] }) {
  return (
    <div className="h-70 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#0C1B33" opacity={0.06} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.55 }}
            axisLine={{ stroke: "#0C1B33", opacity: 0.10 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#0C1B33", opacity: 0.55 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "rgba(27,82,168,0.05)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E5E0D4",
              boxShadow: "0 8px 24px rgba(12,27,51,0.08)",
              background: "#fff",
            }}
            labelFormatter={(label) => formatShortDate(String(label))}
            formatter={(value) => [Number(value ?? 0), "Bookings"]}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            fill={BAR}
            activeBar={{ fill: BAR_HOVER }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
