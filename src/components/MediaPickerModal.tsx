"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type MediaItem = {
  id:          string;
  mediaUrl:    string;
  mimeType:    string;
  fileName:    string;
  messageType: string;
  timestamp:   string;
  guest:       { phone: string; name: string | null };
};

const TABS = ["All", "Images", "Audio", "Video", "Documents"] as const;
type Tab = typeof TABS[number];

function tabFilter(tab: Tab, item: MediaItem): boolean {
  if (tab === "All")       return true;
  if (tab === "Images")    return item.mimeType?.startsWith("image/") ?? false;
  if (tab === "Audio")     return item.mimeType?.startsWith("audio/") ?? false;
  if (tab === "Video")     return item.mimeType?.startsWith("video/") ?? false;
  if (tab === "Documents") return item.messageType === "document";
  return true;
}

export default function MediaPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (item: MediaItem) => void;
  onClose:  () => void;
}) {
  const [media,    setMedia]    = useState<MediaItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("All");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/messages/media")
      .then((res: any) => setMedia(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = media.filter((item) => tabFilter(tab, item));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Choose from Gallery</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                tab === t
                  ? "bg-[#7A3F91] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">No media found.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item.id === selected ? null : item.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition aspect-square ${
                    selected === item.id
                      ? "border-[#7A3F91] ring-2 ring-[#7A3F91]/30"
                      : "border-transparent hover:border-gray-200"
                  }`}
                >
                  {item.mimeType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
                  ) : item.mimeType?.startsWith("video/") ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <span className="text-2xl">🎥</span>
                    </div>
                  ) : item.mimeType?.startsWith("audio/") ? (
                    <div className="w-full h-full bg-purple-50 flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">🎵</span>
                      <span className="text-[10px] text-gray-400">Audio</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-1 px-2">
                      <span className="text-2xl">📄</span>
                      <span className="text-[10px] text-gray-500 truncate w-full text-center">{item.fileName}</span>
                    </div>
                  )}

                  {/* Selected checkmark */}
                  {selected === item.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#7A3F91] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Guest label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-1">
                    <p className="text-[9px] text-white truncate">
                      {item.guest?.name ?? item.guest?.phone}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              disabled={!selected}
              onClick={() => {
                const item = media.find((m) => m.id === selected);
                if (item) onSelect(item);
              }}
              className="rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B0D3E] transition disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
