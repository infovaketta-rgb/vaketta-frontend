"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useMounted } from "@/lib/useMounted";
import { SkeletonChatRow } from "@/components/Skeleton";

type Conversation = {
  guestId: string;
  phone: string;
  name: string | null;
  lastHandledByStaff: boolean;
  lastMessage: string | null;
  lastMessageType: string | null;
  lastDirection: "IN" | "OUT" | null;
  lastTimestamp: string | null;
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
    };
    const label = labels[lastMessageType] ?? "📎 Attachment";
    return lastMessage ? `${label} • ${lastMessage}` : label;
  }
  return lastMessage ?? "No messages yet";
}

export default function ChatList() {
  const mounted = useMounted();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const selectedGuestId = useChatStore((s) => s.selectedGuestId);
  const setSelectedGuest = useChatStore((s) => s.setSelectedGuest);

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
      setConversations((prev) => {
        const exists = prev.find((c) => c.guestId === message.guestId);

        if (exists) {
          const updated = prev.map((c) =>
            c.guestId === message.guestId
              ? {
                  ...c,
                  lastMessage: message.body,
                  lastMessageType: message.messageType ?? null,
                  lastDirection: message.direction,
                  lastTimestamp: message.timestamp,
                  unreadCount:
                    message.direction === "IN" && message.guestId !== selectedGuestId
                      ? c.unreadCount + 1
                      : c.unreadCount,
                }
              : c
          );
          const target = updated.find((c) => c.guestId === message.guestId)!;
          return [target, ...updated.filter((c) => c.guestId !== message.guestId)];
        } else {
          apiFetch("/conversations")
            .then(setConversations)
            .catch(console.error);
          return prev;
        }
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

  if (!mounted) return null;

  const filtered = conversations.filter((c) =>
    c.phone.includes(search.trim())
  );

  return (
    <div className="flex flex-col h-full w-full md:w-80 md:shrink-0 border-r border-[#E5E0D4] bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#E5E0D4]">
        <h2 className="text-base font-semibold text-[#0C1B33] mb-3">Chats</h2>
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
            </svg>
            No conversations found
          </div>
        )}

        {!loading && filtered.map((c) => {
          const isActive = c.guestId === selectedGuestId;
          const avatarColor = getAvatarColor(c.phone);
          const preview = getLastMessagePreview(c.lastMessage, c.lastMessageType);
          return (
            <div
              key={c.guestId}
              onClick={() => { if (c.guestId !== selectedGuestId) setSelectedGuest(c.guestId, !c.lastHandledByStaff, c.phone, c.name); }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#E5E0D4]/60 ${
                isActive
                  ? "bg-blue-50 border-l-2 border-l-[#1B52A8]"
                  : "hover:bg-[#F4F2ED]"
              }`}
            >
              {/* Colored avatar */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ backgroundColor: avatarColor }}
              >
                {c.phone.replace(/\D/g, "").slice(-2)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0C1B33] truncate">
                    {formatPhone(c.phone)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
