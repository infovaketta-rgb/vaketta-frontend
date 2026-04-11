"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import BookingsBarChart from "@/components/dashboard/BookingsBarChart";
import RecentBookingsTable from "@/components/dashboard/RecentBookingsTable";
import RevenueLineChart from "@/components/dashboard/RevenueLineChart";
import StatCard from "@/components/dashboard/StatCard";
import type { DashboardPayload } from "@/types/dashboard";
import { formatCurrency } from "@/lib/locale";

export default function DashboardPage() {
  const mounted = useMounted();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const json = (await apiFetch("/dashboard")) as DashboardPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#F4F2ED]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1B52A8] border-t-transparent" />
          <p className="text-sm font-medium text-[#0C1B33]/60">
            Loading analytics…
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
          <p className="font-semibold text-rose-900">Could not load dashboard</p>
          <p className="mt-2 text-sm text-rose-800/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F4F2ED]">
      <div className="border-b border-[#0C1B33]/8 bg-white/80 px-6 py-6 backdrop-blur-sm lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-[#0C1B33]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">
          Revenue, bookings, and guest activity for your property
        </p>
      </div>

      <div className="space-y-8 px-6 py-8 lg:px-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Today revenue"
            stat={data.stats.todayRevenue}
            formatValue={(n) => formatCurrency(n)}
            trendLabel="vs yesterday (confirmed)"
          />
          <StatCard
            title="Total bookings"
            subtitle="All time"
            stat={data.stats.totalBookings}
            trendLabel="New bookings: last 7d vs prior 7d"
          />
          <StatCard
            title="Active guests"
            subtitle="Messaged in the last 24h"
            stat={data.stats.activeGuests24h}
            trendLabel="vs previous 24h"
          />
          <StatCard
            title="Pending bookings"
            stat={data.stats.pendingBookings}
            trendLabel="New pending: last 7d vs prior 7d"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#0C1B33]">
              Revenue (7 days)
            </h2>
            <p className="mt-0.5 text-xs text-[#0C1B33]/45">
              Confirmed booking totals by day
            </p>
            <div className="mt-4">
              <RevenueLineChart data={data.revenueLast7Days} />
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E0D4] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#0C1B33]">
              Booking volume (7 days)
            </h2>
            <p className="mt-0.5 text-xs text-[#0C1B33]/45">
              New bookings created per day
            </p>
            <div className="mt-4">
              <BookingsBarChart data={data.bookingsLast7Days} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-[#0C1B33]">
            Recent bookings
          </h2>
          <RecentBookingsTable rows={data.recentBookings} />
        </section>
      </div>
    </div>
  );
}
