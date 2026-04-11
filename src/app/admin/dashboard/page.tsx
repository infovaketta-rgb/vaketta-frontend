"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";

interface HotelRow {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  _count: { users: number; guests: number; bookings: number };
}

interface Stats {
  totalHotels:   number;
  totalUsers:    number;
  totalBookings: number;
  totalGuests:   number;
}

function KpiCard({ label, value, icon, accent }: {
  label:  string;
  value:  number;
  icon:   string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E0D4] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${accent}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/45">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-[#0C1B33]">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [recentHotels, setRecentHotels] = useState<HotelRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    adminApiFetch("/admin/hotels?page=1&limit=10")
      .then((res: any) => {
        if (cancelled) return;
        const hotels: HotelRow[] = res.hotels ?? [];
        setStats({
          totalHotels:   res.total ?? hotels.length,
          totalUsers:    hotels.reduce((s: number, h: HotelRow) => s + h._count.users, 0),
          totalBookings: hotels.reduce((s: number, h: HotelRow) => s + h._count.bookings, 0),
          totalGuests:   hotels.reduce((s: number, h: HotelRow) => s + h._count.guests, 0),
        });
        setRecentHotels(hotels);
      })
      .catch((e: any) => { if (!cancelled && e.message !== "Unauthorized") setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mounted, router]);

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Platform Overview</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">
          Aggregated across the most recent 10 hotels. Visit Hotels for full data.
        </p>
      </div>

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#E5E0D4]" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Hotels"   value={stats.totalHotels}   icon="🏨" accent="bg-[#1B52A8]/8" />
          <KpiCard label="Total Users"    value={stats.totalUsers}    icon="👥" accent="bg-[#B8912E]/10" />
          <KpiCard label="Total Bookings" value={stats.totalBookings} icon="📋" accent="bg-emerald-50" />
          <KpiCard label="Total Guests"   value={stats.totalGuests}   icon="🧑‍🤝‍🧑" accent="bg-slate-50" />
        </div>
      ) : null}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Recent Hotels table */}
      <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0C1B33]">Recent Hotels</h2>
          <Link href="/admin/hotels" className="text-xs font-semibold text-[#1B52A8] hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D4] text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/50">
                {["Name", "Phone", "Users", "Bookings", "Guests", "Joined"].map((h) => (
                  <th key={h} className={`px-5 py-3 ${["Users","Bookings","Guests"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(6)].map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 rounded bg-[#E5E0D4]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentHotels.map((h) => (
                    <tr key={h.id} className="transition hover:bg-[#F4F2ED]/60">
                      <td className="px-5 py-3 font-medium">
                        <Link href={`/admin/hotels/${h.id}`} className="text-[#1B52A8] hover:underline">
                          {h.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[#0C1B33]/60">{h.phone}</td>
                      <td className="px-5 py-3 text-right text-[#0C1B33]/70">{h._count.users}</td>
                      <td className="px-5 py-3 text-right text-[#0C1B33]/70">{h._count.bookings}</td>
                      <td className="px-5 py-3 text-right text-[#0C1B33]/70">{h._count.guests}</td>
                      <td className="px-5 py-3 text-[#0C1B33]/55">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
