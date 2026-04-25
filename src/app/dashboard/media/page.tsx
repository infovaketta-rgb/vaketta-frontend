"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaItem = {
  id:          string;
  mediaUrl:    string;
  mimeType:    string | null;
  fileName:    string | null;
  messageType: string;
  timestamp:   string;
  direction:   "IN" | "OUT";
  guest:       { phone: string; name: string | null } | null;
};

type FilterTab = "all" | "image" | "audio" | "video" | "document";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function guestLabel(item: MediaItem) {
  if (!item.guest) return "Guest";
  return item.guest.name || item.guest.phone;
}

// ── Audio Player ──────────────────────────────────────────────────────────────

const WAVEFORM = [3,5,8,4,9,6,7,5,3,8,6,9,4,7,5,8,3,6,9,5,7,4,8,6,3,9,5,7,4,6];

function AudioPlayer({ src }: { src: string }) {
  const audioRef   = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [error,    setError]    = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a || error) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  }

  function fmt(s: number) {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  const filled = Math.round((progress / 100) * WAVEFORM.length);

  if (error) return <p className="text-xs text-red-400 italic py-1">Audio unavailable</p>;

  return (
    <div className="flex items-center gap-2 py-0.5" style={{ minWidth: 200 }}>
      <audio
        ref={audioRef} src={src} preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a || !a.duration) return;
          setCurrent(a.currentTime);
          setProgress((a.currentTime / a.duration) * 100);
        }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onError={() => setError(true)}
      />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-[#7A3F91] flex items-center justify-center shrink-0 text-white"
      >
        {playing ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="flex items-center gap-0.5 flex-1">
        {WAVEFORM.map((h, i) => (
          <div key={i} className="rounded-full shrink-0"
            style={{ width: 2.5, height: h * 2.4,
              backgroundColor: i < filled ? "#7A3F91" : "#ddd6fe" }} />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">
        {playing || current > 0 ? fmt(current) : fmt(duration)}
      </span>
    </div>
  );
}

// ── Doc icon ──────────────────────────────────────────────────────────────────

function DocIcon({ fileName, mimeType }: { fileName: string | null; mimeType: string | null }) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeType ?? "";
  if (ext === "pdf" || mime === "application/pdf")
    return <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xs font-bold">PDF</div>;
  if (["doc","docx"].includes(ext))
    return <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-bold">DOC</div>;
  if (["xls","xlsx"].includes(ext))
    return <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xs font-bold">XLS</div>;
  return <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">FILE</div>;
}

// ── Media card ────────────────────────────────────────────────────────────────

function MediaCard({ item, onImageClick }: { item: MediaItem; onImageClick: (src: string) => void }) {
  const mime = item.mimeType ?? "";
  const url  = item.mediaUrl;

  // Image card
  if (mime.startsWith("image/")) {
    return (
      <button
        onClick={() => onImageClick(url)}
        className="group relative block w-full aspect-square rounded-xl overflow-hidden bg-gray-100 focus:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={item.fileName ?? "image"} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
          <p className="text-white text-[10px] font-medium truncate">{guestLabel(item)}</p>
          <p className="text-white/70 text-[9px]">{formatTime(item.timestamp)}</p>
        </div>
        <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          item.direction === "OUT" ? "bg-[#7A3F91]/80 text-white" : "bg-black/50 text-white"
        }`}>
          {item.direction === "OUT" ? "Sent" : "Recv"}
        </span>
      </button>
    );
  }

  // Video card
  if (mime.startsWith("video/")) {
    return (
      <div className="group relative w-full aspect-square rounded-xl overflow-hidden bg-black">
        <video src={url} className="w-full h-full object-cover opacity-80" preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
          <p className="text-white text-[10px] truncate">{guestLabel(item)}</p>
          <p className="text-white/60 text-[9px]">{formatTime(item.timestamp)}</p>
        </div>
        <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          item.direction === "OUT" ? "bg-[#7A3F91]/80 text-white" : "bg-black/50 text-white"
        }`}>
          {item.direction === "OUT" ? "Sent" : "Recv"}
        </span>
      </div>
    );
  }

  // Audio card
  if (mime.startsWith("audio/")) {
    return (
      <div className="rounded-xl border border-purple-100 bg-[#F8F4FF] p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-[#7A3F91]/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[#7A3F91]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            item.direction === "OUT" ? "bg-[#7A3F91]/10 text-[#7A3F91]" : "bg-gray-100 text-gray-500"
          }`}>
            {item.direction === "OUT" ? "Sent" : "Recv"}
          </span>
        </div>
        <AudioPlayer src={url} />
        <div className="mt-0.5">
          <p className="text-xs font-medium text-gray-700 truncate">{guestLabel(item)}</p>
          <p className="text-[10px] text-gray-400">{formatTime(item.timestamp)}</p>
        </div>
      </div>
    );
  }

  // Document card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition p-3 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <DocIcon fileName={item.fileName} mimeType={mime} />
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
          item.direction === "OUT" ? "bg-[#7A3F91]/10 text-[#7A3F91]" : "bg-gray-100 text-gray-500"
        }`}>
          {item.direction === "OUT" ? "Sent" : "Recv"}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-800 truncate leading-tight">
          {item.fileName ?? "document"}
        </p>
        <p className="text-[10px] text-gray-500 truncate mt-0.5">{guestLabel(item)}</p>
        <p className="text-[10px] text-gray-400">{formatTime(item.timestamp)}</p>
      </div>
    </a>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="full size"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  const labels: Record<FilterTab, string> = {
    all: "No media yet", image: "No images yet",
    audio: "No audio yet", video: "No videos yet", document: "No documents yet",
  };
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-500">{labels[filter]}</p>
        <p className="text-xs text-gray-400 mt-1">Media shared in chats will appear here.</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",      label: "All"       },
  { key: "image",    label: "Images"    },
  { key: "audio",    label: "Audio"     },
  { key: "video",    label: "Video"     },
  { key: "document", label: "Documents" },
];

export default function MediaGalleryPage() {
  const mounted = useMounted();

  const [media,    setMedia]    = useState<MediaItem[]>([]);
  const [filter,   setFilter]   = useState<FilterTab>("all");
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setMedia([]);
    setPage(1);
    fetchMedia(1, true);
  }, [mounted, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMedia(pageNum: number, replace: boolean) {
    replace ? setLoading(true) : setLoadMore(true);
    try {
      const data = await apiFetch(`/messages/media?page=${pageNum}`);
      const items: MediaItem[] = data.data ?? [];

      // Client-side filter by tab
      const filtered = filter === "all"
        ? items
        : items.filter((m) => (m.mimeType ?? "").startsWith(filter + "/") ||
            (filter === "document" && !["image/","video/","audio/"].some((p) => (m.mimeType ?? "").startsWith(p))));

      setMedia((prev) => replace ? filtered : [...prev, ...filtered]);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error("Failed to load media", e);
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchMedia(next, false);
  }

  // Grid column classes differ for document/audio (wider cards) vs image/video (square thumbnails)
  const isSquareGrid = filter === "image" || filter === "video" ||
    (filter === "all" && media.some((m) => (m.mimeType ?? "").startsWith("image/")));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[#0C1B33]">Media Gallery</h2>
        {!loading && (
          <p className="text-sm text-gray-400">{total} item{total !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? "bg-white text-[#0C1B33] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className={`grid gap-3 ${
          filter === "audio" || filter === "document"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }`}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-square" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <>
          <div className={`grid gap-3 ${
            filter === "audio" || filter === "document"
              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              : filter === "all"
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          }`}>
            {media.map((item) => (
              <MediaCard key={item.id} item={item} onImageClick={setLightbox} />
            ))}
          </div>

          {/* Load more */}
          {page < pages && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadMore}
                className="px-6 py-2.5 rounded-xl bg-[#7A3F91] text-white text-sm font-medium hover:bg-[#6B3580] disabled:opacity-50 transition"
              >
                {loadMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
