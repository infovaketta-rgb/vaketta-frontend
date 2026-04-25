"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useMounted } from "@/lib/useMounted";
import BookingForm from "./BookingForm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const FRONTEND_LIMITS: Record<string, number> = {
  "image/":       5  * 1024 * 1024,
  "audio/":       16 * 1024 * 1024,
  "video/":       16 * 1024 * 1024,
  "application/": 100 * 1024 * 1024,
};

function getMediaSizeLimit(mimeType: string): number {
  for (const [prefix, limit] of Object.entries(FRONTEND_LIMITS)) {
    if (mimeType.startsWith(prefix)) return limit;
  }
  return 5 * 1024 * 1024;
}

// ── Audio Player ──────────────────────────────────────────────────────────────

// Decorative waveform heights (30 bars, varied like a real voice message)
const WAVEFORM = [3,5,8,4,9,6,7,5,3,8,6,9,4,7,5,8,3,6,9,5,7,4,8,6,3,9,5,7,4,6];

function AudioPlayer({ src, isOut }: { src: string; isOut: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  // ✅ FIX: use a.paused (live DOM property) — never stale, unlike `playing` state
  function toggle() {
    const a = audioRef.current;
    if (!a || loadError) return;
    if (a.paused) {
      // ✅ FIX: handle the Promise — browsers block unhandled rejections
      a.play().catch((err) => {
        console.error("Audio play failed:", err);
        setLoadError(true);
      });
    } else {
      a.pause();
    }
  }

  function fmt(s: number): string {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const activeColor  = isOut ? "#075e54" : "#7c3aed";
  const inactiveColor = isOut ? "#a7f3d0" : "#ddd6fe";
  const filledBars = Math.round((progress / 100) * WAVEFORM.length);

  if (loadError) {
    return (
      <p className="text-xs text-red-400 italic py-1 pr-8">Audio unavailable</p>
    );
  }

  return (
    <div className="flex items-center gap-2 py-0.5" style={{ minWidth: 220 }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a || !a.duration) return;
          setCurrentTime(a.currentTime);
          setProgress((a.currentTime / a.duration) * 100);
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a) setDuration(a.duration);
        }}
        onError={() => setLoadError(true)}
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform"
        style={{ backgroundColor: activeColor }}
      >
        {playing ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform + scrubber stacked */}
      <div className="flex-1 flex flex-col gap-0.5 relative">

        {/* Waveform bars (decorative, filled left→right as audio plays) */}
        <div
          className="flex items-center gap-0.5 h-7 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            const a = audioRef.current;
            if (a?.duration) {
              a.currentTime = (pct / 100) * a.duration;
              setProgress(pct);
            }
          }}
        >
          {WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="rounded-full shrink-0 transition-colors duration-75"
              style={{
                width: 3,
                height: h * 2.8,
                backgroundColor: i < filledBars ? activeColor : inactiveColor,
              }}
            />
          ))}
        </div>

        {/* Time */}
        <span className="text-[10px]" style={{ color: isOut ? "#075e54" : "#6b7280" }}>
          {playing || currentTime > 0 ? fmt(currentTime) : fmt(duration)}
        </span>
      </div>
    </div>
  );
}

// ── Video Player ──────────────────────────────────────────────────────────────

function VideoPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.play(); }
  }

  return (
    <div className="relative rounded-xl overflow-hidden max-w-full bg-black cursor-pointer" onClick={toggle}>
      <video
        ref={videoRef}
        src={src}
        className="max-w-full max-h-56 rounded-xl block"
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div className="w-12 h-12 rounded-full bg-black/50 border-2 border-white/80 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Document icon ─────────────────────────────────────────────────────────────

function DocIcon({ fileName, mimeType }: { fileName: string | null; mimeType: string }) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  let color = "text-gray-500 bg-gray-100";
  let label = ext.toUpperCase() || "FILE";

  if (ext === "pdf" || mimeType === "application/pdf") { color = "text-red-500 bg-red-50"; label = "PDF"; }
  else if (["doc", "docx"].includes(ext)) { color = "text-blue-500 bg-blue-50"; label = "DOC"; }
  else if (["xls", "xlsx"].includes(ext)) { color = "text-green-600 bg-green-50"; label = "XLS"; }
  else if (["ppt", "pptx"].includes(ext)) { color = "text-orange-500 bg-orange-50"; label = "PPT"; }
  else if (["zip", "rar", "7z"].includes(ext)) { color = "text-yellow-600 bg-yellow-50"; label = "ZIP"; }

  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${color}`}>
      {label}
    </div>
  );
}

// ── Media bubble ──────────────────────────────────────────────────────────────

function MediaBubble({ mediaUrl, mimeType, fileName, body, isOut, onImageClick }: {
  mediaUrl: string;
  mimeType: string;
  fileName: string | null;
  body:     string | null;
  isOut:    boolean;
  onImageClick: (src: string) => void;
}) {
  if (mediaUrl.startsWith("pending://")) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <span className="text-xs text-gray-400 italic">Uploading media…</span>
      </div>
    );
  }

  const src = mediaUrl.startsWith("meta://")
    ? null
    : mediaUrl.startsWith("http")
      ? mediaUrl
      : `${API_BASE}${mediaUrl}`;

  if (!src) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1">
        <span>📎</span>
        <span>Media (configure META_ACCESS_TOKEN to view)</span>
      </div>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className="space-y-1">
        <button onClick={() => onImageClick(src)} className="block rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={fileName ?? "image"} className="max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition rounded-lg" />
        </button>
        {body && <p className="text-sm text-gray-800 pr-10">{body}</p>}
      </div>
    );
  }

  if (mimeType.startsWith("video/")) {
    return (
      <div className="space-y-1">
        <VideoPlayer src={src} />
        {body && <p className="text-sm text-gray-800 pr-10 mt-1">{body}</p>}
      </div>
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <div className="space-y-0.5 py-0.5">
        <AudioPlayer src={src} isOut={isOut} />
        {body && <p className="text-xs text-gray-500">{body}</p>}
      </div>
    );
  }

  // Document / other
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 py-1 pr-10 hover:opacity-80 transition"
    >
      <DocIcon fileName={fileName} mimeType={mimeType} />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate">{fileName ?? "Download file"}</span>
        <span className="text-[11px] text-gray-400">Tap to open</span>
      </div>
    </a>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    const country = digits.slice(0, digits.length - 10);
    return `+${country} ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
}

function formatMsgTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" });
}

function groupMessagesByDate(messages: any[]) {
  const groups: { date: string; messages: any[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const dateKey = new Date(msg.timestamp).toDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({ date: msg.timestamp, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

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

// ── ChatWindow ────────────────────────────────────────────────────────────────

// ── Delete popup ──────────────────────────────────────────────────────────────
function DeletePopup({
  messageId,
  onClose,
  onDelete,
}: {
  messageId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-72 rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 text-center">
          <p className="text-sm font-semibold text-gray-800">Delete message?</p>
          <p className="text-xs text-gray-400 mt-1">The message will be removed from the chat history.</p>
        </div>

        <div className="py-1">
          <button
            onClick={() => { onDelete(messageId); onClose(); }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-red-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center shrink-0 transition-colors">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-600">Delete message</p>
          </button>

          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors group border-t border-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">Cancel</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const mounted = useMounted();
  const [showBooking, setShowBooking] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const guestId = useChatStore((s) => s.selectedGuestId);
  const messages = useChatStore((s) => s.messages);
  const replaceMessages = useChatStore((s) => s.replaceMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const markMessagesRead = useChatStore((s) => s.markMessagesRead);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);

  const botEnabled = useChatStore((s) => s.botEnabled);
  const setBotEnabledStore = useChatStore((s) => s.setBotEnabled);
  const selectedGuestPhone = useChatStore((s) => s.selectedGuestPhone);
  const selectedGuestName  = useChatStore((s) => s.selectedGuestName);
  const setSelectedGuestName = useChatStore((s) => s.setSelectedGuestName);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isOut: boolean } | null>(null);

  // Undo-send state: messageId → remaining seconds
  const [pendingUndos, setPendingUndos] = useState<Map<string, number>>(new Map());
  const undoTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const [text, setText] = useState("");
  const [togglingBot, setTogglingBot] = useState(false);
  const [sendError, setSendError] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Media preview state — file staged here before confirm-send
  const [mediaPreview, setMediaPreview] = useState<{
    file:    File;
    dataUrl: string | null; // null for non-image/video (doc/audio)
    caption: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const prevGuestId = useRef<string | null>(null);

  // Scroll management
  useEffect(() => {
    if (!messages.length) return;
    const isNewChat = prevGuestId.current !== guestId;
    prevGuestId.current = guestId;

    if (!isNewChat) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (firstUnreadRef.current) {
          firstUnreadRef.current.scrollIntoView({ behavior: "instant", block: "start" });
        } else {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }
      });
    });
  }, [messages, guestId]);

  // Load messages when guestId changes
  useEffect(() => {
    if (!mounted || !guestId) return;

    setLoading(true);
    apiFetch(`/messages/${guestId}`)
      .then((msgs) => {
        replaceMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    apiFetch(`/messages/${guestId}/read`, { method: "POST" }).catch(console.error);

    // Sync bot toggle from DB
    apiFetch("/conversations")
      .then((convs: any[]) => {
        const match = convs.find((c: any) => c.guestId === guestId);
        if (match) setBotEnabledStore(!match.lastHandledByStaff);
      })
      .catch(() => {});

  }, [mounted, guestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket
  useEffect(() => {
    if (!mounted) return;
    const socket = getSocket();

    const onNewMessage = ({ message }: { message: any }) => addMessage(message);
    const onRead = ({ guestId: readGuestId }: { guestId: string }) => markMessagesRead(readGuestId);
    const onStatus = ({ messageId, status }: { messageId: string; status: string }) =>
      updateMessageStatus(messageId, status);
    const onDeleted = ({ messageId, deletedBy }: { messageId: string; deletedBy: string }) => {
      // Patch the message in-store to its tombstone shape
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, deleted: true, deletedBy, body: null, mediaUrl: null, mimeType: null, fileName: null }
            : m
        ),
      }));
    };

    const onUndo = ({ messageId }: { messageId: string }) => {
  const timer = undoTimersRef.current.get(messageId);
  if (timer) { clearInterval(timer); undoTimersRef.current.delete(messageId); }
  setPendingUndos((prev) => { const n = new Map(prev); n.delete(messageId); return n; });
  useChatStore.getState().removeMessage(messageId);
};

    const onMediaReady = ({ messageId, mediaUrl, mimeType, fileName }: {
      messageId: string; mediaUrl: string; mimeType: string; fileName: string;
    }) => {
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, mediaUrl, mimeType, fileName } : m
        ),
      }));
    };

socket.on("message:new", onNewMessage);
socket.on("message:read", onRead);
socket.on("message:status", onStatus);
socket.on("message:deleted", onDeleted);
socket.on("message:undo", onUndo);
socket.on("message:media_ready", onMediaReady);

return () => {
  socket.off("message:new", onNewMessage);
  socket.off("message:read", onRead);
  socket.off("message:status", onStatus);
  socket.off("message:deleted", onDeleted);
  socket.off("message:undo", onUndo);
  socket.off("message:media_ready", onMediaReady);
};
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete message — soft-delete in DB, bubble becomes tombstone
  async function handleDelete(messageId: string) {
    try {
      const res = await apiFetch(`/messages/${messageId}`, { method: "DELETE" });
      const deletedBy: string = res?.message?.deletedBy ?? "Staff";
      // Patch message in-store to tombstone shape
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, deleted: true, deletedBy, body: null, mediaUrl: null, mimeType: null, fileName: null }
            : m
        ),
      }));
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  // Bot toggle
  async function saveName() {
    setEditingName(false);
    const trimmed = nameInput.trim();
    if (!trimmed || !guestId || trimmed === selectedGuestName) return;
    try {
      await apiFetch(`/conversations/${guestId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setSelectedGuestName(trimmed);
    } catch {
      // silent — store name unchanged
    }
  }

  async function toggleBot() {
    if (!guestId || togglingBot) return;
    const next = !botEnabled;
    setTogglingBot(true);
    try {
      await apiFetch(`/messages/${guestId}/bot`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
      setBotEnabledStore(next);
    } catch (e) {
      console.error("Bot toggle failed", e);
    } finally {
      setTogglingBot(false);
    }
  }

  const ALLOWED_MEDIA_TYPES = [
    "image/jpeg","image/jpg","image/png","image/webp","image/gif",
    "video/mp4","video/3gpp","video/quicktime",
    "audio/ogg","audio/mpeg","audio/mp4","audio/webm","audio/wav",
    "application/pdf","application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  // Low-level upload — used by confirmSendMedia and voice recording
  async function uploadMedia(file: File, caption?: string) {
    if (!guestId) return;
    setSendError("");
    setUploadingMedia(true);

    // Optimistic bubble — show the media immediately using a local blob URL
    const tempId = `tmp_${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);
    const mimeBase = file.type.split(";")[0]!.trim();
    const messageType = mimeBase.startsWith("image/") ? "image"
                      : mimeBase.startsWith("video/") ? "video"
                      : mimeBase.startsWith("audio/") ? "audio"
                      : "document";
    addMessage({
      id:          tempId,
      direction:   "OUT",
      body:        caption?.trim() || null,
      messageType,
      mediaUrl:    blobUrl,
      mimeType:    mimeBase,
      fileName:    file.name,
      timestamp:   new Date().toISOString(),
      status:      "SENDING",
      guestId,
      deleted:     false,
      deletedBy:   null,
      jobId:       null,
    });

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") : null;
      const form = new FormData();
      form.append("file", file);
      form.append("guestId", guestId);
      if (caption?.trim()) form.append("caption", caption.trim());
      const res = await fetch(`${API_BASE}/messages/send-media`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      if (data?.id) {
        addMessage({ ...data, guestId });
        updateMessageStatus(tempId, "REPLACED");
      }
    } catch (e: any) {
      console.error("Media send failed", e);
      updateMessageStatus(tempId, "FAILED");
      setSendError(e?.message ?? "Failed to send file. Please try again.");
      setTimeout(() => setSendError(""), 4000);
    } finally {
      URL.revokeObjectURL(blobUrl);
      setUploadingMedia(false);
    }
  }

  // Stage a file for preview — validates then shows preview modal
  function stageMediaFile(file: File) {
    if (!guestId) return;
    const limit = getMediaSizeLimit(file.type);
    if (file.size > limit) {
      setSendError(`File too large. Max ${limit / (1024 * 1024)} MB for this file type.`);
      setTimeout(() => setSendError(""), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setSendError("Unsupported file type.");
      setTimeout(() => setSendError(""), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const canPreview = file.type.startsWith("image/") || file.type.startsWith("video/");
    const dataUrl = canPreview ? URL.createObjectURL(file) : null;
    setMediaPreview({ file, dataUrl, caption: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Confirm send from preview modal
  async function confirmSendMedia() {
    if (!guestId || !mediaPreview) return;
    const { file, caption } = mediaPreview;
    setMediaPreview(null);
    await uploadMedia(file, caption);
  }

  // Voice recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        // Voice recordings skip preview — send directly
        await uploadMedia(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setSendError("Microphone access denied.");
      setTimeout(() => setSendError(""), 4000);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  // Send text
  async function sendMessage() {
    if (!text.trim() || !guestId || sending) return;
    setSendError("");
    setSending(true);

    // Optimistic message — shown immediately with a temp id
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      id:          tempId,
      direction:   "OUT" as const,
      body:        text,
      messageType: "text",
      mediaUrl:    null,
      mimeType:    null,
      fileName:    null,
      timestamp:   new Date().toISOString(),
      status:      "SENDING",
      guestId,
      deleted:     false,
      deletedBy:   null,
      jobId:       null,
    };
    addMessage(optimistic);
    setText("");

    try {
      const result = await apiFetch("/messages/reply", {
        method: "POST",
        body: JSON.stringify({ guestId, text: optimistic.body }),
      });
      // result is { message, delaySeconds }
      const saved = result.message ?? result;
      const delaySeconds: number | null = result.delaySeconds ?? null;

      // Replace optimistic entry with real DB record
      addMessage({ ...saved, guestId });
      updateMessageStatus(tempId, "REPLACED");

      // Start undo countdown if delay is set
      if (delaySeconds && saved.id) {
        const msgId = saved.id as string;
        setPendingUndos((prev) => new Map(prev).set(msgId, delaySeconds));

        const timer = setInterval(() => {
          setPendingUndos((prev) => {
            const next = new Map(prev);
            const remaining = (next.get(msgId) ?? 1) - 1;
            if (remaining <= 0) {
              next.delete(msgId);
              clearInterval(undoTimersRef.current.get(msgId));
              undoTimersRef.current.delete(msgId);
            } else {
              next.set(msgId, remaining);
            }
            return next;
          });
        }, 1000);

        undoTimersRef.current.set(msgId, timer);
      }
    } catch (e: any) {
      console.error("Send failed", e);
      updateMessageStatus(tempId, "FAILED");
      setSendError(e?.message ?? "Failed to send. Please try again.");
      setTimeout(() => setSendError(""), 4000);
    } finally {
      setSending(false);
    }
  }

  // Undo a delayed send — cancels the BullMQ job and removes the bubble
  async function handleUndo(messageId: string) {
    // Clear countdown timer immediately
    const timer = undoTimersRef.current.get(messageId);
    if (timer) { clearInterval(timer); undoTimersRef.current.delete(messageId); }
    setPendingUndos((prev) => { const n = new Map(prev); n.delete(messageId); return n; });

    try {
      await apiFetch(`/messages/${messageId}/undo-send`, { method: "DELETE" });
      useChatStore.getState().removeMessage(messageId);
    } catch (e) {
      console.error("Undo failed", e);
    }
  }

  if (!guestId) {
    return (
      <div className="flex flex-col flex-1 min-w-0 items-center justify-center h-full w-full bg-[#f0ebe3] relative overflow-hidden">
        <div className="absolute w-80 h-80 rounded-full bg-purple-200 opacity-25 -top-16 -right-16 pointer-events-none" />
        <div className="absolute w-56 h-56 rounded-full bg-purple-300 opacity-15 bottom-24 -left-16 pointer-events-none" />
        <div className="absolute w-36 h-36 rounded-full bg-amber-200 opacity-25 bottom-12 right-24 pointer-events-none" />
        <div className="flex flex-col items-center gap-5 z-10 px-8 text-center max-w-xs">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a11.96 11.96 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-gray-800 font-semibold text-lg">Vaketta Chat</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Select a guest from the left to view their conversation and reply.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: "Real-time messaging", color: "text-purple-700 bg-purple-50 border-purple-100" },
              { label: "Create bookings", color: "text-green-700 bg-green-50 border-green-100" },
              { label: "Read receipts", color: "text-blue-700 bg-blue-50 border-blue-100" },
            ].map((f) => (
              <span key={f.label} className={`text-xs border px-3 py-1 rounded-full font-medium ${f.color}`}>
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupMessagesByDate(
    messages.filter((m) => m.status !== "REPLACED")
  );
  const firstUnreadId = messages.find(
    (m) => m.direction === "IN" && m.status === "RECEIVED"
  )?.id ?? null;
  const avatarColor = selectedGuestPhone ? getAvatarColor(selectedGuestPhone) : "#7c3aed";

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 bg-[#f0ebe3]">

      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm">
        {/* Back button — mobile only */}
        <button
          onClick={() => useChatStore.getState().setSelectedGuest(null)}
          className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center mr-1 shrink-0"
          aria-label="Back to conversations"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {selectedGuestPhone ? selectedGuestPhone.replace(/\D/g, "").slice(-2) : "G"}
        </div>

        {/* Name / status */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="w-full bg-transparent text-sm font-semibold text-gray-900 border-b border-[#1B52A8] outline-none"
            />
          ) : (
            <p
              className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-[#1B52A8] transition"
              title="Click to edit name"
              onClick={() => { setNameInput(selectedGuestName ?? ""); setEditingName(true); }}
            >
              {selectedGuestName || (selectedGuestPhone ? formatPhone(selectedGuestPhone) : "Guest")}
            </p>
          )}
          <p className="text-xs text-gray-500">WhatsApp</p>
        </div>

        {/* Voice call (UI only) */}
        <button
          title="Voice call (coming soon)"
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>

        {/* Video call (UI only) */}
        <button
          title="Video call (coming soon)"
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </button>

        {/* Bot toggle */}
        <button
          onClick={toggleBot}
          disabled={togglingBot}
          title={botEnabled ? "Bot is ON — click to hand off to staff" : "Bot is OFF — click to re-enable"}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
            botEnabled
              ? "text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
              : "text-gray-500 bg-gray-100 hover:bg-gray-200 border-gray-200"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${botEnabled ? "bg-green-500" : "bg-gray-400"}`} />
          Bot {botEnabled ? "ON" : "OFF"}
        </button>

        {/* Create Booking */}
        <button
          onClick={() => setShowBooking(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Booking
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

        {loading && (
          <div className="flex justify-center py-10">
            <div className="flex gap-2 items-center text-gray-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading messages…
            </div>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <p className="text-sm">No messages yet</p>
          </div>
        )}

        {!loading && grouped.map((group, gi) => (
          <div key={gi}>
            {/* Date Divider */}
            <div className="flex items-center justify-center my-4">
              <span className="text-[11px] text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                {formatDateDivider(group.date)}
              </span>
            </div>

            {/* Messages in group */}
            <div className="space-y-1">
              {group.messages.map((m) => {
                const isOut = m.direction === "OUT";
                const isFirstUnread = m.id === firstUnreadId;
                return (
                  <div key={m.id}>
                    {isFirstUnread && (
                      <div ref={firstUnreadRef} className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-green-300 opacity-60" />
                        <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                          Unread messages
                        </span>
                        <div className="flex-1 h-px bg-green-300 opacity-60" />
                      </div>
                    )}
                    {/* Bubble row — hover reveals ⋮ delete button */}
                    <div className={`flex items-end gap-1.5 group/row ${isOut ? "justify-end" : "justify-start"}`}>

                      {/* ⋮ button — left side for incoming, right side for outgoing */}
                      {!isOut && !m.deleted && (
                        <button
                          onClick={() => setDeleteTarget({ id: m.id, isOut })}
                          className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 mb-1"
                          title="Delete message"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                      )}

                      <div
                        className={`relative max-w-[65%] px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          isOut
                            ? "bg-[#d9fdd3] text-gray-900 rounded-br-sm"
                            : "bg-white text-gray-900 rounded-bl-sm"
                        }`}
                      >
                        {m.deleted ? (
                          <p className="flex items-center gap-1.5 pr-10 italic text-gray-400 text-sm select-none">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Message deleted by {m.deletedBy ?? "Staff"}
                          </p>
                        ) : m.mediaUrl ? (
                          <MediaBubble
                            mediaUrl={m.mediaUrl}
                            mimeType={m.mimeType ?? "application/octet-stream"}
                            fileName={m.fileName ?? null}
                            body={m.body}
                            isOut={isOut}
                            onImageClick={setLightboxSrc}
                          />
                        ) : (
                          <p className="pr-10 whitespace-pre-wrap">{m.body}</p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            {formatMsgTime(m.timestamp)}
                          </span>
                          {isOut && (
                            <span className={`text-[11px] leading-none ${m.status === "READ" ? "text-blue-500" : "text-gray-400"}`}>
                              {m.status === "SENDING"   && <span className="opacity-60">🕐</span>}
                              {m.status === "PENDING"   && "🕐"}
                              {m.status === "FAILED"    && <span className="text-red-400" title="Failed to send">✕</span>}
                              {m.status === "SENT"      && "✔"}
                              {m.status === "DELIVERED" && "✔✔"}
                              {m.status === "READ"      && "✔✔"}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOut && !m.deleted && (
                        <button
                          onClick={() => setDeleteTarget({ id: m.id, isOut })}
                          className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 mb-1"
                          title="Delete message"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <p className="text-xs text-red-500 bg-red-50 border-t border-red-100 px-4 py-1.5">{sendError}</p>
      )}

      {/* Undo-send countdown strips */}
      {pendingUndos.size > 0 && Array.from(pendingUndos.entries()).map(([msgId, secs]) => (
        <div
          key={msgId}
          className="flex items-center justify-between bg-[#2B0D3E] text-white text-xs px-4 py-2 border-t border-purple-900"
        >
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 animate-spin opacity-70" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sending in {secs}s…
          </span>
          <button
            onClick={() => handleUndo(msgId)}
            className="font-semibold text-yellow-300 hover:text-yellow-100 transition-colors px-2 py-0.5 rounded hover:bg-white/10"
          >
            Undo
          </button>
        </div>
      ))}

      {/* Media preview modal */}
      {mediaPreview && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-3">
          {/* Preview area */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center w-24 h-24">
              {mediaPreview.dataUrl && mediaPreview.file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPreview.dataUrl} alt="preview" className="w-full h-full object-cover" />
              ) : mediaPreview.dataUrl && mediaPreview.file.type.startsWith("video/") ? (
                <video src={mediaPreview.dataUrl} className="w-full h-full object-cover" muted />
              ) : mediaPreview.file.type.startsWith("audio/") ? (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <span className="text-[10px]">Audio</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[10px] truncate max-w-20">{mediaPreview.file.name}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{mediaPreview.file.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{(mediaPreview.file.size / 1024).toFixed(0)} KB</p>
              <input
                type="text"
                value={mediaPreview.caption}
                onChange={(e) => setMediaPreview((p) => p ? { ...p, caption: e.target.value } : p)}
                onKeyDown={(e) => e.key === "Enter" && confirmSendMedia()}
                placeholder="Add a caption… (optional)"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A3F91] transition"
                autoFocus
              />
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                if (mediaPreview.dataUrl) URL.revokeObjectURL(mediaPreview.dataUrl);
                setMediaPreview(null);
              }}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmSendMedia}
              disabled={uploadingMedia}
              className="flex items-center gap-2 rounded-lg bg-[#7A3F91] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#2B0D3E] disabled:opacity-50 transition"
            >
              {uploadingMedia ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Sending…</>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) stageMediaFile(file);
          }}
        />

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingMedia || isRecording}
          title="Send photo, video, audio or document"
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center shrink-0 transition-colors"
        >
          {uploadingMedia ? (
            <svg className="w-4 h-4 text-gray-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        {/* Text input */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={isRecording}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300 text-gray-800 placeholder-gray-400 disabled:opacity-50"
          placeholder={isRecording ? "Recording…" : "Type a reply…"}
        />

        {/* Send or Mic button */}
        {text.trim() ? (
          /* Send */
          <button
            onClick={sendMessage}
            disabled={sending}
            className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        ) : (
          /* Mic */
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={uploadingMedia}
            title={isRecording ? "Stop recording and send" : "Hold to record voice message"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {isRecording ? (
              /* Stop icon */
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              /* Mic icon */
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && guestId && (
        <BookingForm guestId={guestId} onClose={() => setShowBooking(false)} />
      )}

      {/* Image Lightbox */}
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
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Download */}
          <a
            href={lightboxSrc}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      )}

      {/* Delete popup */}
      {deleteTarget && (
        <DeletePopup
          messageId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
