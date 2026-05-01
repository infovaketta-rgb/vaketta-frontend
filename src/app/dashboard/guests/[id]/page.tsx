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
  mediaUrl:    string | null;
  mimeType:    string | null;
  fileName:    string | null;
  status:      string;
};

type MediaMessage = {
  id:        string;
  mediaUrl:  string;
  mimeType:  string | null;
  fileName:  string | null;
  timestamp: string;
  direction: "IN" | "OUT";
};

type ActivityEntry = {
  type:      string;
  timestamp: string;
  label:     string;
};

type GuestDetail = {
  id:                 string;
  name:               string | null;
  phone:              string;
  notes:              string | null;
  isVip:              boolean;
  tags:               string[];
  createdAt:          string;
  lastHandledByStaff: boolean;
  totalMessages:      number;
  totalSpend:         number;
  lastActivity:       string;
  channel:            MessageChannel;
  bookings:           Booking[];
  recentMessages:     RecentMessage[];
  mediaMessages:      MediaMessage[];
  activityLog:        ActivityEntry[];
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

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 px-2">
      <span className="text-lg font-bold text-[#0C1B33]">{value}</span>
      <span className="text-[10px] text-[#0C1B33]/50 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "overview" | "bookings" | "messages" | "media" | "activity";

export default function GuestDetailPage() {
  const mounted  = useMounted();
  const router   = useRouter();
  const { id }   = useParams() as { id: string };
  const { addToast } = useToastStore();
  const setSelectedGuest = useChatStore((s) => s.setSelectedGuest);

  const [guest,   setGuest]   = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<Tab>("overview");

  // Inline name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [savingName,  setSavingName]  = useState(false);

  // Notes auto-save
  const [notes,       setNotes]       = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirtyRef = useRef(false);

  // Tags
  const [tagInput,    setTagInput]    = useState("");
  const [addingTag,   setAddingTag]   = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

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

  async function toggleVip() {
    if (!guest) return;
    const newVal = !guest.isVip;
    setGuest((g) => g ? { ...g, isVip: newVal } : g);
    try {
      await apiFetch(`/guests/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ isVip: newVal }),
      });
    } catch (e: any) {
      setGuest((g) => g ? { ...g, isVip: !newVal } : g);
      addToast(e.message || "Failed to update VIP status", "error");
    }
  }

  async function addTag() {
    const tag = tagInput.trim();
    if (!tag || !guest) return;
    if (guest.tags.includes(tag)) { setTagInput(""); return; }
    const newTags = [...guest.tags, tag];
    setGuest((g) => g ? { ...g, tags: newTags } : g);
    setTagInput("");
    setAddingTag(false);
    try {
      await apiFetch(`/guests/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ tags: newTags }),
      });
    } catch (e: any) {
      setGuest((g) => g ? { ...g, tags: guest.tags } : g);
      addToast(e.message || "Failed to save tag", "error");
    }
  }

  async function removeTag(tag: string) {
    if (!guest) return;
    const newTags = guest.tags.filter((t) => t !== tag);
    setGuest((g) => g ? { ...g, tags: newTags } : g);
    try {
      await apiFetch(`/guests/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ tags: newTags }),
      });
    } catch (e: any) {
      setGuest((g) => g ? { ...g, tags: guest.tags } : g);
      addToast(e.message || "Failed to remove tag", "error");
    }
  }

  function copyPhone() {
    if (!guest) return;
    navigator.clipboard.writeText(guest.phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
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

  const avatarColor    = getAvatarColor(guest.phone);
  const avatarInitials = guest.channel === "INSTAGRAM"
    ? (guest.name ? guest.name.slice(0, 2).toUpperCase() : "IG")
    : guest.phone.replace(/\D/g, "").slice(-2);
  const displayName    = guest.name || (guest.channel === "INSTAGRAM" ? "Instagram User" : guest.phone);
  const avg            = avgStayNights(guest.bookings);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview",  label: "Overview" },
    { key: "bookings",  label: "Bookings",  count: guest.bookings.length },
    { key: "messages",  label: "Messages",  count: guest.recentMessages.length },
    { key: "media",     label: "Media",     count: guest.mediaMessages.length },
    { key: "activity",  label: "Activity",  count: guest.activityLog.length },
  ];

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
            {guest.isVip && (
              <span className="text-amber-400 text-base" title="VIP Guest">★</span>
            )}
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

            {/* Avatar + VIP + name */}
            <div className="flex flex-col items-center gap-3 pb-5 border-b border-[#E5E0D4]">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarInitials}
                </div>
                {/* Channel ring indicator */}
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
                {/* VIP star overlay */}
                <button
                  onClick={toggleVip}
                  title={guest.isVip ? "Remove VIP" : "Mark as VIP"}
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white text-[11px] transition
                    ${guest.isVip ? "bg-amber-400 text-white" : "bg-white text-[#0C1B33]/30 hover:bg-amber-50 hover:text-amber-400"}`}
                >
                  ★
                </button>
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

            {/* Stats mini-grid */}
            <div className="grid grid-cols-3 divide-x divide-[#E5E0D4] border-b border-[#E5E0D4] -mx-5 px-5">
              <StatMini label="Messages"  value={guest.totalMessages} />
              <StatMini label="Bookings"  value={guest.bookings.length} />
              <StatMini label="Spent"     value={guest.totalSpend > 0 ? formatCurrency(guest.totalSpend) : "—"} />
            </div>

            {/* Meta */}
            <div className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#0C1B33]/50 shrink-0">Phone / ID</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-[#0C1B33]/80 text-xs text-right break-all">{guest.phone}</span>
                  <button
                    onClick={copyPhone}
                    title="Copy"
                    className="shrink-0 text-[#0C1B33]/30 hover:text-[#7A3F91] transition"
                  >
                    {copied ? (
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                <span className="text-[#0C1B33]/50">Avg stay</span>
                <span className="text-[#0C1B33]/80 text-xs">{avg > 0 ? `${avg} night${avg !== 1 ? "s" : ""}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#0C1B33]/50">Bot</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${guest.lastHandledByStaff ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                  {guest.lastHandledByStaff ? "OFF" : "ON"}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4 pt-4 border-t border-[#E5E0D4]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#0C1B33]/50 uppercase tracking-wider">Tags</p>
                <button
                  onClick={() => setAddingTag(true)}
                  className="text-[10px] text-[#7A3F91] hover:text-[#2B0D3E] font-semibold transition"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {guest.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7A3F91]/10 text-[#7A3F91]"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-[#7A3F91]/60 hover:text-red-500 transition leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {guest.tags.length === 0 && !addingTag && (
                  <span className="text-[11px] text-[#0C1B33]/30 italic">No tags yet</span>
                )}
              </div>
              {addingTag && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    autoFocus
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTag();
                      if (e.key === "Escape") { setAddingTag(false); setTagInput(""); }
                    }}
                    placeholder="Type tag…"
                    className="flex-1 rounded-lg border border-[#E5E0D4] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A3F91]/25 focus:border-[#7A3F91]"
                  />
                  <button
                    onClick={addTag}
                    className="rounded-lg bg-[#7A3F91] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#2B0D3E] transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingTag(false); setTagInput(""); }}
                    className="rounded-lg border border-[#E5E0D4] px-2.5 py-1 text-xs text-[#0C1B33]/50 hover:bg-[#F4F2ED] transition"
                  >
                    ✕
                  </button>
                </div>
              )}
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
          <div className="flex gap-1 rounded-xl border border-[#E5E0D4] bg-white p-1 mb-4 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-max rounded-lg py-2 px-3 text-sm font-medium transition whitespace-nowrap ${
                  tab === t.key
                    ? "bg-[#7A3F91] text-white shadow-sm"
                    : "text-[#0C1B33]/60 hover:text-[#0C1B33] hover:bg-[#F4F2ED]"
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-[#E5E0D4]"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Messages", value: guest.totalMessages },
                  { label: "Total Bookings", value: guest.bookings.length },
                  { label: "Total Spend",    value: guest.totalSpend > 0 ? formatCurrency(guest.totalSpend) : "—" },
                  { label: "Avg Stay",       value: avg > 0 ? `${avg} night${avg !== 1 ? "s" : ""}` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-[#E5E0D4] bg-white p-4">
                    <p className="text-xs font-medium text-[#0C1B33]/50 mb-1">{label}</p>
                    <p className="text-xl font-bold text-[#0C1B33]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Recent messages preview (top 5) */}
              <div className="rounded-xl border border-[#E5E0D4] bg-white">
                <div className="px-4 pt-4 pb-2 border-b border-[#E5E0D4] flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#0C1B33]">Recent Messages</p>
                  {guest.recentMessages.length > 5 && (
                    <button onClick={() => setTab("messages")} className="text-xs text-[#7A3F91] hover:underline">
                      View all {guest.recentMessages.length}
                    </button>
                  )}
                </div>
                {guest.recentMessages.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[#0C1B33]/40 text-sm">No messages yet.</div>
                ) : (
                  <div className="divide-y divide-[#E5E0D4]">
                    {guest.recentMessages.slice(0, 5).map((m) => (
                      <div key={m.id} className={`flex items-start gap-3 px-4 py-3 ${m.direction === "OUT" ? "bg-[#F4F2ED]/40" : ""}`}>
                        <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          m.direction === "IN" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
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
                        <span className="shrink-0 text-[11px] text-[#0C1B33]/40 whitespace-nowrap">{relativeTime(m.timestamp)}</span>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED]">
                      <tr className="text-left text-[#0C1B33]/55 text-xs uppercase tracking-wider font-semibold">
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Total</th>
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
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Messages ── */}
          {tab === "messages" && (
            <div className="rounded-xl border border-[#E5E0D4] bg-white overflow-hidden">
              {guest.recentMessages.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-[#0C1B33]/40 text-sm">No messages yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0 p-4 max-h-[600px] overflow-y-auto">
                  {[...guest.recentMessages].reverse().map((m) => {
                    const isOut    = m.direction === "OUT";
                    const src      = m.mediaUrl ? (m.mediaUrl.startsWith("http") ? m.mediaUrl : `${API_BASE}${m.mediaUrl}`) : null;
                    const isImage  = m.mimeType?.startsWith("image/");
                    return (
                      <div
                        key={m.id}
                        className={`flex mb-2 ${isOut ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isOut
                              ? "bg-[#7A3F91] text-white rounded-br-sm"
                              : "bg-[#F4F2ED] text-[#0C1B33] rounded-bl-sm"
                          }`}
                        >
                          {src && isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt={m.fileName ?? "media"}
                              className="rounded-lg max-w-[200px] cursor-pointer"
                              onClick={() => setLightboxSrc(src)}
                            />
                          ) : src ? (
                            <a href={src} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 text-xs underline ${isOut ? "text-white/80" : "text-[#1B52A8]"}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {m.fileName ?? "Download file"}
                            </a>
                          ) : m.messageType !== "text" ? (
                            <span className={`italic text-xs ${isOut ? "text-white/70" : "text-[#0C1B33]/50"}`}>
                              {({ image: "📷 Photo", video: "🎥 Video", audio: "🎵 Voice message", document: "📄 Document" } as any)[m.messageType] ?? "📎 Attachment"}
                            </span>
                          ) : (
                            <span className="whitespace-pre-wrap break-words leading-relaxed">{m.body ?? ""}</span>
                          )}
                          <div className={`mt-1 flex items-center gap-1 justify-end ${isOut ? "text-white/50" : "text-[#0C1B33]/35"}`}>
                            <span className="text-[10px]">{relativeTime(m.timestamp)}</span>
                            {isOut && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                {m.status === "READ" ? (
                                  <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                                ) : (
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                )}
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    const src      = m.mediaUrl.startsWith("http") ? m.mediaUrl : `${API_BASE}${m.mediaUrl}`;
                    const isImage  = m.mimeType?.startsWith("image/");
                    const isVideo  = m.mimeType?.startsWith("video/");
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

          {/* ── Tab: Activity ── */}
          {tab === "activity" && (
            <div className="rounded-xl border border-[#E5E0D4] bg-white overflow-hidden">
              {guest.activityLog.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-[#0C1B33]/40 text-sm">No activity yet.</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-[#E5E0D4]" />
                    <div className="flex flex-col gap-0">
                      {guest.activityLog.map((entry, i) => (
                        <div key={i} className="relative flex items-start gap-4 pb-5">
                          {/* Dot */}
                          <div className={`relative z-10 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white ${
                            entry.type === "booking"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            {entry.type === "booking" ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="text-sm text-[#0C1B33]">{entry.label}</p>
                            <p className="text-xs text-[#0C1B33]/40 mt-0.5">{relativeTime(entry.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
