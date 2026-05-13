"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useMounted } from "@/lib/useMounted";
import { useToastStore } from "@/store/toastStore";
import { SkeletonChatRow } from "@/components/Skeleton";
import NewChatModal from "@/components/NewChatModal";

type MessageChannel = "WHATSAPP" | "INSTAGRAM";

type Conversation = {
  guestId: string;
  phone: string;
  name: string | null;
  lastHandledByStaff: boolean;
  lastMessage: string | null;
  lastMessageType: string | null;
  lastDirection: "IN" | "OUT" | null;
  lastTimestamp: string | null;
  channel: MessageChannel;
  unreadCount: number;
};

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#7986CB",
  "#4FC3F7", "#4DB6AC", "#81C784", "#FFD54F",
  "#FF8A65", "#A1887F",
];

function getAvatarColor(phone: string): string {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = (hash << 5) - hash + phone.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(ts: string | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    const country = digits.slice(0, digits.length - 10);
    return `+${country} ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
}

function getLastMessagePreview(
  lastMessage: string | null,
  lastMessageType: string | null,
): string {
  if (lastMessageType && lastMessageType !== "text") {
    const labels: Record<string, string> = {
      image:    "📷 Photo",
      video:    "🎥 Video",
      audio:    "🎵 Voice message",
      document: "📄 Document",
      carousel: "🛏️ Room options",
    };
    const label = labels[lastMessageType] ?? "📎 Attachment";
    // For media-with-caption we suffix the caption. Carousel's body is a JSON
    // payload, not human-readable, so the label alone is the right preview.
    if (lastMessageType === "carousel") return label;
    return lastMessage ? `${label} • ${lastMessage}` : label;
  }
  return lastMessage ?? "No messages yet";
}

// ── Confirmation modal ────────────────────────────────────────────────────────

type ConfirmModalProps = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmModal({ title, body, confirmLabel, danger = false, loading, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-80 p-5 mx-4">
        <p className="text-[14px] font-semibold text-[#0C1B33] mb-1">{title}</p>
        <p className="text-[12px] text-slate-500 mb-4">{body}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg text-white text-[13px] font-medium transition disabled:opacity-40 ${
              danger ? "bg-red-500 hover:bg-red-600" : "bg-[#1B52A8] hover:bg-[#164088]"
            }`}
          >{loading ? "Please wait…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Row dropdown menu ─────────────────────────────────────────────────────────

type DropdownProps = {
  onDelete: () => void;
  onSelect: () => void;
  onClear: () => void;
  onClose: () => void;
};

function RowDropdown({ onDelete, onSelect, onClear, onClose }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-2 top-8 z-40 bg-white rounded-xl shadow-lg border border-[#E5E0D4] py-1 w-40 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onSelect(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 hover:bg-[#F4F2ED] transition text-left"
      >
        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} strokeLinecap="round" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
        Select
      </button>
      <button
        onClick={() => { onClear(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 hover:bg-[#F4F2ED] transition text-left"
      >
        <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
        </svg>
        Clear Chat
      </button>
      <div className="mx-2 my-1 border-t border-[#E5E0D4]" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition text-left"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatList() {
  const mounted = useMounted();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const selectedGuestId = useChatStore((s) => s.selectedGuestId);
  const setSelectedGuest = useChatStore((s) => s.setSelectedGuest);
  const replaceMessages  = useChatStore((s) => s.replaceMessages);
  const { addToast } = useToastStore();

  // ── Context menu state ──────────────────────────────────────────────────────
  const [openMenuId,    setOpenMenuId]    = useState<string | null>(null);
  const [hoveredId,     setHoveredId]     = useState<string | null>(null);

  // ── Confirmation modals ─────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
  const [confirmClear,  setConfirmClear]  = useState<Conversation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectMode,    setSelectMode]    = useState(false);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [bulkConfirm,   setBulkConfirm]   = useState<"delete" | "clear" | null>(null);
  const [bulkLoading,   setBulkLoading]   = useState(false);

  // Keep ref in sync so socket handlers always see the latest list
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Load conversations on mount
  useEffect(() => {
    if (!mounted) return;
    apiFetch("/conversations")
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mounted]);

  // Socket: update conversation list in real-time
  useEffect(() => {
    if (!mounted) return;
    const socket = getSocket();

    const onNewMessage = ({ message }: { message: any }) => {
      if (!conversationsRef.current.some((c) => c.guestId === message.guestId)) {
        apiFetch("/conversations").then(setConversations).catch(console.error);
        return;
      }
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.guestId === message.guestId
            ? {
                ...c,
                lastMessage: message.body,
                lastMessageType: message.messageType ?? null,
                lastDirection: message.direction,
                lastTimestamp: message.timestamp,
                channel: (message.channel as MessageChannel) ?? c.channel,
                unreadCount:
                  message.direction === "IN" && message.guestId !== selectedGuestId
                    ? c.unreadCount + 1
                    : c.unreadCount,
              }
            : c
        );
        const target = updated.find((c) => c.guestId === message.guestId)!;
        return [target, ...updated.filter((c) => c.guestId !== message.guestId)];
      });
    };

    const onRead = ({ guestId }: { guestId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.guestId === guestId ? { ...c, unreadCount: 0 } : c
        )
      );
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:read", onRead);
    };
  }, [mounted, selectedGuestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleDelete(c: Conversation) {
    setActionLoading(true);
    try {
      await apiFetch(`/conversations/${c.guestId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((x) => x.guestId !== c.guestId));
      if (selectedGuestId === c.guestId) setSelectedGuest(null);
      addToast("Conversation deleted", "success");
    } catch {
      addToast("Failed to delete conversation", "error");
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
    }
  }

  async function handleClear(c: Conversation) {
    setActionLoading(true);
    try {
      await apiFetch(`/conversations/${c.guestId}/messages`, { method: "DELETE" });
      setConversations((prev) =>
        prev.map((x) =>
          x.guestId === c.guestId
            ? { ...x, lastMessage: null, lastMessageType: null, lastDirection: null, lastTimestamp: null, unreadCount: 0 }
            : x
        )
      );
      if (selectedGuestId === c.guestId) replaceMessages([]);
      addToast("Chat cleared", "success");
    } catch {
      addToast("Failed to clear chat", "error");
    } finally {
      setActionLoading(false);
      setConfirmClear(null);
    }
  }

  async function handleBulkAction(action: "delete" | "clear") {
    setBulkLoading(true);
    const ids = [...selected];
    try {
      await apiFetch("/conversations/bulk", {
        method: "DELETE",
        body: JSON.stringify({ guestIds: ids, action }),
      });
      if (action === "delete") {
        setConversations((prev) => prev.filter((c) => !ids.includes(c.guestId)));
        if (ids.includes(selectedGuestId ?? "")) setSelectedGuest(null);
        addToast(`${ids.length} conversation${ids.length !== 1 ? "s" : ""} deleted`, "success");
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            ids.includes(c.guestId)
              ? { ...c, lastMessage: null, lastMessageType: null, lastDirection: null, lastTimestamp: null, unreadCount: 0 }
              : c
          )
        );
        if (ids.includes(selectedGuestId ?? "")) replaceMessages([]);
        addToast(`${ids.length} chat${ids.length !== 1 ? "s" : ""} cleared`, "success");
      }
      exitSelectMode();
    } catch {
      addToast("Bulk action failed", "error");
    } finally {
      setBulkLoading(false);
      setBulkConfirm(null);
    }
  }

  function enterSelectMode(guestId: string) {
    setSelectMode(true);
    setSelected(new Set([guestId]));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function toggleSelect(guestId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  }

  function toggleSelectAll() {
    const filteredIds = filtered.map((c) => c.guestId);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filteredIds]));
    }
  }

  if (!mounted) return null;

  const q = search.trim().toLowerCase();
  const filtered = conversations.filter((c) =>
    !q ||
    c.phone.toLowerCase().includes(q) ||
    (c.name ?? "").toLowerCase().includes(q)
  );

  const allSelected  = filtered.length > 0 && filtered.every((c) => selected.has(c.guestId));
  const someSelected = !allSelected && filtered.some((c) => selected.has(c.guestId));

  return (
    <div className="relative flex flex-col h-full w-full md:w-80 md:shrink-0 border-r border-[#E5E0D4] bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#E5E0D4]">
        {selectMode ? (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2.5 mb-3 group w-full text-left"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              allSelected
                ? "bg-[#1B52A8] border-[#1B52A8]"
                : someSelected
                ? "border-[#1B52A8] bg-white"
                : "border-slate-300 bg-white group-hover:border-[#1B52A8]"
            }`}>
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {someSelected && (
                <div className="w-2.5 h-0.5 rounded bg-[#1B52A8]" />
              )}
            </div>
            <span className="text-sm font-semibold text-[#0C1B33]">
              {allSelected ? `All ${filtered.length} selected` : "Select all"}
            </span>
          </button>
        ) : (
          <h2 className="text-base font-semibold text-[#0C1B33] mb-3">Chats</h2>
        )}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[#F4F2ED] border-none outline-none focus:ring-2 focus:ring-[#1B52A8]/20 text-[#0C1B33] placeholder-slate-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && [...Array(6)].map((_, i) => <SkeletonChatRow key={i} />)}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
            </svg>
            No conversations found
          </div>
        )}

        {!loading && filtered.map((c) => {
          const isActive   = c.guestId === selectedGuestId;
          const isSelected = selected.has(c.guestId);
          const isHovered  = hoveredId === c.guestId;
          const avatarColor = getAvatarColor(c.phone);
          const preview     = getLastMessagePreview(c.lastMessage, c.lastMessageType);

          return (
            <div
              key={c.guestId}
              className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#E5E0D4]/60 ${
                isSelected
                  ? "bg-blue-50/70 border-l-2 border-l-[#1B52A8]"
                  : isActive
                  ? "bg-blue-50 border-l-2 border-l-[#1B52A8]"
                  : "hover:bg-[#F4F2ED]"
              }`}
              onMouseEnter={() => setHoveredId(c.guestId)}
              onMouseLeave={() => { setHoveredId(null); }}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(c.guestId);
                  return;
                }
                if (c.guestId !== selectedGuestId) {
                  setSelectedGuest(c.guestId, !c.lastHandledByStaff, c.phone, c.name, c.channel);
                }
              }}
            >
              {/* Multi-select checkbox */}
              {selectMode && (
                <div
                  className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected ? "bg-[#1B52A8] border-[#1B52A8]" : "border-slate-300 bg-white"
                  }`}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(c.guestId); }}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              {/* Colored avatar with channel badge */}
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {c.channel === "INSTAGRAM"
                    ? (c.name ? c.name.slice(0, 2).toUpperCase() : "IG")
                    : c.phone.replace(/\D/g, "").slice(-2)}
                </div>
                {c.channel === "INSTAGRAM" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-white"
                    style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0C1B33] truncate">
                    {c.name || (c.channel === "INSTAGRAM" ? "Instagram User" : formatPhone(c.phone))}
                  </span>
                  <span className={`text-[11px] shrink-0 ${c.unreadCount > 0 ? "text-[#1B52A8] font-medium" : "text-slate-400"}`}>
                    {formatTime(c.lastTimestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={`text-xs truncate ${c.unreadCount > 0 ? "text-[#0C1B33] font-medium" : "text-slate-500"}`}>
                    {c.lastDirection === "OUT" && (
                      <span className="text-slate-400 mr-1">You:</span>
                    )}
                    {preview}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.lastHandledByStaff && (
                      <span title="Bot is OFF" className="text-[10px] text-slate-500 bg-[#F4F2ED] border border-[#E5E0D4] px-1.5 py-0.5 rounded-full">
                        Bot OFF
                      </span>
                    )}
                    {c.unreadCount > 0 && (
                      <span className="min-w-4.5 h-4.5 rounded-full bg-[#1B52A8] text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-dot menu button — visible on hover, hidden in select mode */}
              {!selectMode && (isHovered || openMenuId === c.guestId) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((prev) => prev === c.guestId ? null : c.guestId);
                  }}
                  className="absolute right-2 top-2 w-6 h-6 flex items-center justify-center rounded-md bg-white/80 hover:bg-[#E5E0D4] text-slate-500 transition"
                  title="More options"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5"  r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              )}

              {/* Dropdown */}
              {openMenuId === c.guestId && (
                <RowDropdown
                  onDelete={() => setConfirmDelete(c)}
                  onSelect={() => enterSelectMode(c.guestId)}
                  onClear={() => setConfirmClear(c)}
                  onClose={() => setOpenMenuId(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="shrink-0 border-t border-[#E5E0D4] bg-white px-3 py-2.5 flex items-center gap-2">
          <span className="flex-1 text-[13px] font-medium text-[#0C1B33]">
            {selected.size} selected
          </span>
          <button
            onClick={() => setBulkConfirm("clear")}
            disabled={selected.size === 0 || bulkLoading}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#F4F2ED] border border-[#E5E0D4] text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
          >Clear</button>
          <button
            onClick={() => setBulkConfirm("delete")}
            disabled={selected.size === 0 || bulkLoading}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40 transition"
          >Delete</button>
          <button
            onClick={exitSelectMode}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-[#F4F2ED] transition"
          >Cancel</button>
        </div>
      )}

      {/* FAB — New Chat */}
      {!selectMode && (
        <button
          onClick={() => setNewChatOpen(true)}
          className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 text-white flex items-center justify-center shadow-md transition-all z-10"
          aria-label="New chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onStart={(guestId) => {
          setNewChatOpen(false);
          setSelectedGuest(guestId);
          setConversations((prev) => {
            if (prev.find((c) => c.guestId === guestId)) return prev;
            return [{
              guestId,
              phone: "",
              name: null,
              lastHandledByStaff: false,
              lastMessage: null,
              lastMessageType: null,
              lastDirection: null,
              lastTimestamp: null,
              channel: "WHATSAPP",
              unreadCount: 0,
            }, ...prev];
          });
        }}
      />

      {/* Single-item confirmation modals */}
      {confirmDelete && (
        <ConfirmModal
          title={`Delete conversation with ${confirmDelete.name || formatPhone(confirmDelete.phone)}?`}
          body="Messages will be deleted. The guest profile is kept. This cannot be undone."
          confirmLabel="Delete"
          danger
          loading={actionLoading}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear all messages?"
          body="The conversation thread will remain. This cannot be undone."
          confirmLabel="Clear"
          loading={actionLoading}
          onConfirm={() => handleClear(confirmClear)}
          onCancel={() => setConfirmClear(null)}
        />
      )}

      {/* Bulk confirmation modals */}
      {bulkConfirm === "delete" && (
        <ConfirmModal
          title={`Delete ${selected.size} conversation${selected.size !== 1 ? "s" : ""}?`}
          body="All messages in the selected conversations will be deleted. Guest profiles are kept. This cannot be undone."
          confirmLabel={`Delete ${selected.size}`}
          danger
          loading={bulkLoading}
          onConfirm={() => handleBulkAction("delete")}
          onCancel={() => setBulkConfirm(null)}
        />
      )}

      {bulkConfirm === "clear" && (
        <ConfirmModal
          title={`Clear ${selected.size} chat${selected.size !== 1 ? "s" : ""}?`}
          body="All messages in the selected chats will be deleted. The conversation threads remain. This cannot be undone."
          confirmLabel={`Clear ${selected.size}`}
          loading={bulkLoading}
          onConfirm={() => handleBulkAction("clear")}
          onCancel={() => setBulkConfirm(null)}
        />
      )}
    </div>
  );
}
