"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useChatStore } from "@/store/chatStore";
import { useToastStore } from "@/store/toastStore";
import { formatCurrency, formatDate } from "@/lib/locale";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type MessageChannel = "WHATSAPP" | "INSTAGRAM";
type BookingStatus  = "ENQUIRY" | "PENDING" | "HOLD" | "CONFIRMED" | "CANCELLED";

type Booking = {
  id:              string;
  referenceNumber: string | null;
  checkIn:         string;
  checkOut:        string;
  status:          BookingStatus;
  totalPrice:      number;
  createdAt:       string;
  roomType:        { name: string } | null;
};

type RecentMessage = {
  id:          string;
  body:        string | null;
  direction:   "IN" | "OUT";
  channel:     MessageChannel;
  messageType: string;
  timestamp:   string;
};

type MediaMessage = {
  id:        string;
  mediaUrl:  string;
  mimeType:  string | null;
  fileName:  string | null;
  timestamp: string;
  direction: "IN" | "OUT";
};

type GuestDetail = {
  id:                 string;
  name:               string | null;
  phone:              string;
  notes:              string | null;
  createdAt:          string;
  lastHandledByStaff: boolean;
  totalMessages:      number;
  lastActivity:       string;
  channel:            MessageChannel;
  bookings:           Booking[];
  recentMessages:     RecentMessage[];
  mediaMessages:      MediaMessage[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#E57373","#F06292","#BA68C8","#7986CB",
  "#4FC3F7","#4DB6AC","#81C784","#FFD54F","#FF8A65","#A1887F",
];

function getAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function avgStayNights(bookings: Booking[]): number {
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  if (!confirmed.length) return 0;
  const total = confirmed.reduce((sum, b) => {
    return sum + Math.max(1, Math.ceil(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
    ));
  }, 0);
  return Math.round(total / confirmed.length);
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<string, string> = {
    PENDING:   "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    HOLD:      "bg-sky-100 text-sky-700",
    ENQUIRY:   "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#E5E0D4] bg-white p-4">
      <p className="text-xs font-medium text-[#0C1B33]/50 mb-1">{label}</p>
      <p className="text-xl font-bold text-[#0C1B33]">{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuestDetailPage() {
  const mounted  = useMounted();
  const router   = useRouter();
  const { id }   = useParams() as { id: string };
  const { addToast } = useToastStore();
  const setSelectedGuest = useChatStore((s) => s.setSelectedGuest);

  const [guest,   setGuest]   = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<"overview" | "bookings" | "media">("overview");

  // Inline name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [savingName,  setSavingName]  = useState(false);

  // Notes auto-save
  const [notes,       setNotes]       = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirtyRef = useRef(false);

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    apiFetch(`/guests/${id}`)
      .then((g: GuestDetail) => {
        setGuest(g);
        setNotes(g.notes ?? "");
      })
      .catch((e: any) => setError(e.message || "Failed to load guest"))
      .finally(() => setLoading(false));
  }, [mounted, id]);

  async function saveName() {
    setEditingName(false);
    const trimmed = nameInput.trim() || null;
    if (trimmed === (guest?.name ?? null)) return;
    setSavingName(true);
    try {
      const updated = await apiFetch(`/guests/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ name: trimmed }),
      });
      setGuest((g) => g ? { ...g, name: updated.name } : g);
    } catch (e: any) {
      addToast(e.message || "Failed to save name", "error");
    } finally {
      setSavingName(false);
    }
  }

  async function saveNotes() {
    if (!notesDirtyRef.current) return;
    notesDirtyRef.current = false;
    setSavingNotes(true);
    try {
      await apiFetch(`/guests/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ notes: notes.trim() || null }),
      });
      setGuest((g) => g ? { ...g, notes: notes.trim() || null } : g);
    } catch (e: any) {
      addToast(e.message || "Failed to save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  function openChat() {
    if (!guest) return;
    setSelectedGuest(guest.id, !guest.lastHandledByStaff, guest.phone, guest.name, guest.channel);
    router.push("/dashboard/chats");
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F4F2ED]">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#F4F2ED]">
        <p className="text-sm text-red-500">{error || "Guest not found"}</p>
        <button onClick={() => router.push("/dashboard/guests")} className="text-sm text-[#1B52A8] hover:underline">
          ← Back to Guests
        </button>
      </div>
    );
  }

  const avatarColor   = getAvatarColor(guest.phone);
  const avatarInitials = guest.channel === "INSTAGRAM"
    ? (guest.name ? guest.name.slice(0, 2).toUpperCase() : "IG")
    : guest.phone.replace(/\D/g, "").slice(-2);
  const displayName   = guest.name || (guest.channel === "INSTAGRAM" ? "Instagram User" : guest.phone);
  const lastBooking   = guest.bookings[0];
  const avg           = avgStayNights(guest.bookings);

  return (
    <div className="h-full overflow-y-auto bg-[#F4F2ED] p-4 md:p-6">

      {/* ── Page header ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/guests")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0D4] bg-white text-[#0C1B33]/60 hover:bg-[#F4F2ED] transition text-sm shrink-0"
          >
            ←
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#0C1B33]">{displayName}</h1>
            <ChannelBadge channel={guest.channel} />
          </div>
        </div>
        <button
          onClick={openChat}
          className="flex items-center gap-2 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B0D3E] transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
          </svg>
          Open Chat
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

        {/* ── Left: profile card ── */}
        <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 pb-5 border-b border-[#E5E0D4]">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarInitials}
                </div>
                {guest.channel === "INSTAGRAM" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Editable name */}
              {editingName ? (
                <div className="w-full">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="w-full rounded-lg border border-[#7A3F91] px-3 py-1.5 text-sm text-center font-semibold text-[#0C1B33] focus:outline-none focus:ring-2 focus:ring-[#7A3F91]/25"
                    disabled={savingName}
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setNameInput(guest.name ?? ""); setEditingName(true); }}
                  title="Click to edit name"
                  className="text-base font-bold text-[#0C1B33] hover:text-[#7A3F91] transition text-center"
                >
                  {guest.name || <span className="text-[#0C1B33]/40 text-sm italic">Add name…</span>}
                </button>
              )}

              <ChannelBadge channel={guest.channel} />
            </div>

            {/* Meta */}
            <div className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#0C1B33]/50 shrink-0">Phone / ID</span>
                <span className="font-mono text-[#0C1B33]/80 text-xs text-right break-all">{guest.phone}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#0C1B33]/50">Member since</span>
                <span className="text-[#0C1B33]/80 text-xs">{formatDate(guest.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#0C1B33]/50">Last active</span>
                <span className="text-[#0C1B33]/80 text-xs">{relativeTime(guest.lastActivity)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#0C1B33]/50">Bot</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${guest.lastHandledByStaff ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                  {guest.lastHandledByStaff ? "OFF" : "ON"}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4 pt-4 border-t border-[#E5E0D4]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-[#0C1B33]/50 uppercase tracking-wider">Notes</p>
                {savingNotes && <span className="text-[10px] text-[#0C1B33]/40">Saving…</span>}
              </div>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); notesDirtyRef.current = true; }}
                onBlur={saveNotes}
                rows={4}
                placeholder="Add private notes about this guest…"
                className="w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-xs text-[#0C1B33] placeholder-[#0C1B33]/30 focus:outline-none focus:ring-2 focus:ring-[#7A3F91]/25 focus:border-[#7A3F91] resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={openChat}
                className="w-full rounded-lg bg-[#7A3F91] py-2 text-sm font-medium text-white hover:bg-[#2B0D3E] transition"
              >
                Open Chat
              </button>
              <button
                onClick={() => router.push("/dashboard/bookings")}
                className="w-full rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: tabbed content ── */}
        <div className="flex-1 min-w-0">

          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl border border-[#E5E0D4] bg-white p-1 mb-4">
            {(["overview", "bookings", "media"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition capitalize ${
                  tab === t
                    ? "bg-[#7A3F91] text-white shadow-sm"
                    : "text-[#0C1B33]/60 hover:text-[#0C1B33] hover:bg-[#F4F2ED]"
                }`}
              >
                {t}
                {t === "bookings" && guest.bookings.length > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20" : "bg-[#E5E0D4]"}`}>
                    {guest.bookings.length}
                  </span>
                )}
                {t === "media" && guest.mediaMessages.length > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/20" : "bg-[#E5E0D4]"}`}>
                    {guest.mediaMessages.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Messages" value={guest.totalMessages} />
                <StatCard label="Total Bookings" value={guest.bookings.length} />
                <StatCard
                  label="Last Booking"
                  value={lastBooking ? relativeTime(lastBooking.createdAt) : "—"}
                />
                <StatCard
                  label="Avg Stay"
                  value={avg > 0 ? `${avg} night${avg !== 1 ? "s" : ""}` : "—"}
                />
              </div>

              {/* Recent messages */}
              <div className="rounded-xl border border-[#E5E0D4] bg-white">
                <div className="px-4 pt-4 pb-2 border-b border-[#E5E0D4]">
                  <p className="text-sm font-semibold text-[#0C1B33]">Recent Messages</p>
                </div>
                {guest.recentMessages.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[#0C1B33]/40 text-sm">No messages yet.</div>
                ) : (
                  <div className="divide-y divide-[#E5E0D4]">
                    {guest.recentMessages.map((m) => (
                      <div key={m.id} className={`flex items-start gap-3 px-4 py-3 ${m.direction === "OUT" ? "bg-[#F4F2ED]/40" : ""}`}>
                        <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          m.direction === "IN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {m.direction}
                        </span>
                        <div className="flex-1 min-w-0">
                          {m.messageType !== "text" ? (
                            <span className="text-sm italic text-[#0C1B33]/50">
                              {({ image: "📷 Photo", video: "🎥 Video", audio: "🎵 Voice message", document: "📄 Document" } as any)[m.messageType] ?? "📎 Attachment"}
                            </span>
                          ) : (
                            <p className="text-sm text-[#0C1B33] truncate">{m.body ?? "—"}</p>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {m.channel === "INSTAGRAM" && (
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #285AEB 90%)" }}
                              title="Instagram"
                            />
                          )}
                          <span className="text-[11px] text-[#0C1B33]/40 whitespace-nowrap">{relativeTime(m.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Bookings ── */}
          {tab === "bookings" && (
            <div className="rounded-xl border border-[#E5E0D4] bg-white overflow-hidden">
              {guest.bookings.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-[#0C1B33]/40 text-sm">No bookings yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED]">
                    <tr className="text-left text-[#0C1B33]/55 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-4 py-3 rounded-tl-xl">Reference</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Check-in</th>
                      <th className="px-4 py-3">Check-out</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right rounded-tr-xl">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D4]">
                    {guest.bookings.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                        className="hover:bg-[#F4F2ED]/60 transition cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          {b.referenceNumber ? (
                            <span className="font-mono text-xs font-semibold text-[#1B52A8] bg-[#1B52A8]/8 px-2 py-1 rounded-md">
                              {b.referenceNumber}
                            </span>
                          ) : (
                            <span className="text-[#0C1B33]/30 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#0C1B33]/70">{b.roomType?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[#0C1B33]/65">{formatDate(b.checkIn)}</td>
                        <td className="px-4 py-3 text-[#0C1B33]/65">{formatDate(b.checkOut)}</td>
                        <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                        <td className="px-4 py-3 text-right font-semibold text-[#B8912E]">{formatCurrency(b.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Tab: Media ── */}
          {tab === "media" && (
            <div>
              {guest.mediaMessages.length === 0 ? (
                <div className="rounded-xl border border-[#E5E0D4] bg-white px-4 py-12 text-center">
                  <p className="text-[#0C1B33]/40 text-sm">No media sent or received.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {guest.mediaMessages.map((m) => {
                    const src = m.mediaUrl.startsWith("http") ? m.mediaUrl : `${API_BASE}${m.mediaUrl}`;
                    const isImage = m.mimeType?.startsWith("image/");
                    const isVideo = m.mimeType?.startsWith("video/");
                    return (
                      <div
                        key={m.id}
                        onClick={() => isImage && setLightboxSrc(src)}
                        className={`rounded-xl border border-[#E5E0D4] bg-white overflow-hidden ${isImage ? "cursor-pointer hover:opacity-90 transition" : ""}`}
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt={m.fileName ?? "media"} className="w-full h-32 object-cover" />
                        ) : isVideo ? (
                          <video src={src} className="w-full h-32 object-cover" muted />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 gap-2 p-3">
                            <svg className="w-8 h-8 text-[#0C1B33]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-[10px] text-[#0C1B33]/50 text-center truncate w-full px-1">{m.fileName ?? "File"}</span>
                          </div>
                        )}
                        <div className="px-2 py-1.5 border-t border-[#E5E0D4]/60 flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${m.direction === "IN" ? "text-blue-600 bg-blue-50" : "text-purple-600 bg-purple-50"}`}>
                            {m.direction}
                          </span>
                          <span className="text-[10px] text-[#0C1B33]/40">{relativeTime(m.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <a
            href={lightboxSrc}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
