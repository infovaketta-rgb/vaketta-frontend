"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useChatStore } from "@/store/chatStore";
import { SkeletonTableRow } from "@/components/Skeleton";

type MessageChannel = "WHATSAPP" | "INSTAGRAM";

type Guest = {
  id:                 string;
  name:               string | null;
  phone:              string;
  createdAt:          string;
  lastHandledByStaff: boolean;
  totalMessages:      number;
  bookingsCount:      number;
  channel:            MessageChannel;
  lastActivity:       string;
};

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#7986CB",
  "#4FC3F7", "#4DB6AC", "#81C784", "#FFD54F",
  "#FF8A65", "#A1887F",
];

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ guest }: { guest: Guest }) {
  const color = getAvatarColor(guest.phone);
  const initials = guest.channel === "INSTAGRAM"
    ? (guest.name ? guest.name.slice(0, 2).toUpperCase() : "IG")
    : guest.phone.replace(/\D/g, "").slice(-2);

  return (
    <div className="relative shrink-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {guest.channel === "INSTAGRAM" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white"
          style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
        >
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ── Channel badge ─────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: MessageChannel }) {
  if (channel === "INSTAGRAM") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
        style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
      >
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
        Instagram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a11.96 11.96 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      </svg>
      WhatsApp
    </span>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const setSelectedGuest = useChatStore((s) => s.setSelectedGuest);

  const [guests,  setGuests]  = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);

  const [search,  setSearch]  = useState("");
  const [channel, setChannel] = useState<"" | "WHATSAPP" | "INSTAGRAM">("");

  // Debounced search — reset to page 1 on filter change
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, channel]);

  const load = useCallback(() => {
    if (!mounted) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search",  debouncedSearch);
    if (channel)         params.set("channel", channel);
    apiFetch(`/guests?${params}`)
      .then((res) => {
        setGuests(res.data ?? []);
        setTotal(res.total  ?? 0);
        setPages(res.pages  ?? 1);
      })
      .catch((err: any) => setError(err.message || "Failed to load guests."))
      .finally(() => setLoading(false));
  }, [mounted, page, debouncedSearch, channel]);

  useEffect(() => { load(); }, [load]);

  function openChat(g: Guest) {
    setSelectedGuest(g.id, !g.lastHandledByStaff, g.phone, g.name, g.channel as "WHATSAPP" | "INSTAGRAM");
    router.push("/dashboard/chats");
  }

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F4F2ED]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Guests</h1>
          {!loading && (
            <p className="text-sm text-[#0C1B33]/50 mt-0.5">{total} guest{total !== 1 ? "s" : ""} total</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E5E0D4] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]"
          />
        </div>

        {/* Channel filter */}
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as typeof channel)}
          className="rounded-lg border border-[#E5E0D4] bg-white px-3 py-2 text-sm text-[#0C1B33] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25"
        >
          <option value="">All Channels</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="INSTAGRAM">Instagram</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E0D4]">

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col divide-y divide-[#E5E0D4]">
          {loading && [...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E5E0D4] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-[#E5E0D4]" />
                <div className="h-3 w-24 rounded bg-[#E5E0D4]" />
              </div>
            </div>
          ))}
          {!loading && guests.length === 0 && (
            <div className="px-4 py-10 text-center text-[#0C1B33]/40 text-sm">No guests found.</div>
          )}
          {!loading && guests.map((g) => (
            <div key={g.id} className="px-4 py-3 flex items-start gap-3">
              <Avatar guest={g} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0C1B33] truncate">
                    {g.name || "Guest"}
                  </p>
                  <ChannelBadge channel={g.channel} />
                </div>
                <p className="text-xs text-[#0C1B33]/50 mt-0.5 truncate">{g.phone}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-[#0C1B33]/55">
                  <span>{g.totalMessages} msg{g.totalMessages !== 1 ? "s" : ""}</span>
                  <span
                    className="cursor-pointer hover:text-[#1B52A8] transition"
                    onClick={() => router.push(`/dashboard/bookings`)}
                  >
                    {g.bookingsCount} booking{g.bookingsCount !== 1 ? "s" : ""}
                  </span>
                  <span className="ml-auto">{relativeTime(g.lastActivity)}</span>
                </div>
              </div>
              <button
                onClick={() => openChat(g)}
                className="shrink-0 rounded-lg border border-[#E5E0D4] px-2.5 py-1.5 text-xs font-medium text-[#1B52A8] hover:bg-[#F2EAF7] transition"
              >
                Chat
              </button>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED]">
            <tr className="text-left text-[#0C1B33]/55 text-xs uppercase tracking-wider font-semibold">
              <th className="px-4 py-3 rounded-tl-xl">Guest</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3 text-right">Messages</th>
              <th className="px-4 py-3 text-right">Bookings</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3 rounded-tr-xl" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D4]">
            {loading && [...Array(8)].map((_, i) => <SkeletonTableRow key={i} />)}
            {!loading && guests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#0C1B33]/40">
                  No guests found.
                </td>
              </tr>
            )}
            {!loading && guests.map((g) => (
              <tr key={g.id} className="hover:bg-[#F4F2ED]/60 transition">
                {/* Avatar + name + phone */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar guest={g} />
                    <div className="min-w-0">
                      <p className="font-medium text-[#0C1B33] truncate">{g.name || "Guest"}</p>
                      <p className="text-xs text-[#0C1B33]/50 truncate">{g.phone}</p>
                    </div>
                  </div>
                </td>

                {/* Channel badge */}
                <td className="px-4 py-3">
                  <ChannelBadge channel={g.channel} />
                </td>

                {/* Total messages */}
                <td className="px-4 py-3 text-right text-[#0C1B33]/70 tabular-nums">
                  {g.totalMessages.toLocaleString()}
                </td>

                {/* Bookings — clickable */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => router.push(`/dashboard/bookings`)}
                    className={`tabular-nums font-medium transition ${
                      g.bookingsCount > 0
                        ? "text-[#1B52A8] hover:underline"
                        : "text-[#0C1B33]/40 cursor-default"
                    }`}
                  >
                    {g.bookingsCount}
                  </button>
                </td>

                {/* Last activity */}
                <td className="px-4 py-3 text-[#0C1B33]/55 text-sm whitespace-nowrap">
                  {relativeTime(g.lastActivity)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => openChat(g)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#1B52A8] hover:bg-[#F2EAF7] transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
                    </svg>
                    Open Chat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E0D4]">
            <p className="text-xs text-slate-500">
              {total} guest{total !== 1 ? "s" : ""} · page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33] hover:bg-[#F2EAF7] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-lg border border-[#E5E0D4] px-3 py-1.5 text-xs font-medium text-[#0C1B33] hover:bg-[#F2EAF7] disabled:opacity-40 disabled:cursor-not-allowed transition"
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
