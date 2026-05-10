"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: (guestId: string) => void;
};

type GuestResult = { id: string; name: string | null; phone: string };

const COUNTRY_CODES = [
  { code: "+91",  label: "🇮🇳 +91"  },
  { code: "+1",   label: "🇺🇸 +1"   },
  { code: "+44",  label: "🇬🇧 +44"  },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+60",  label: "🇲🇾 +60"  },
  { code: "+65",  label: "🇸🇬 +65"  },
  { code: "+61",  label: "🇦🇺 +61"  },
  { code: "+49",  label: "🇩🇪 +49"  },
  { code: "+33",  label: "🇫🇷 +33"  },
  { code: "+81",  label: "🇯🇵 +81"  },
];

export default function NewChatModal({ open, onClose, onStart }: Props) {
  const [tab, setTab] = useState<"search" | "number">("search");

  // Search tab
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuestResult[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<GuestResult | null>(null);
  const [searching, setSearching] = useState(false);

  // New number tab
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestName, setGuestName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setTab("search");
      setQuery("");
      setResults([]);
      setSelectedGuest(null);
      setPhoneNumber("");
      setGuestName("");
      setError(null);
    }
  }, [open]);

  // Debounced guest search — /guests returns { data: [], total, page, pages }
  useEffect(() => {
    if (tab !== "search") return;
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/guests?search=${encodeURIComponent(query.trim())}`);
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, tab]);

  const canConfirm =
    tab === "search"
      ? selectedGuest !== null
      : phoneNumber.trim().length >= 5;

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      let body: object;
      if (tab === "search" && selectedGuest) {
        body = { guestId: selectedGuest.id };
      } else {
        const fullPhone = `${countryCode}${phoneNumber.trim().replace(/^0+/, "")}`;
        body = { phone: fullPhone, name: guestName.trim() || undefined };
      }
      const res = await apiFetch("/conversations/initiate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onStart(res.guestId);
    } catch (e: any) {
      setError(e?.message || "Failed to start conversation");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-[340px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <span className="font-semibold text-gray-800 text-[15px]">New chat</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 mt-3 border-b border-gray-100">
          {(["search", "number"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 pb-2 text-[13px] border-b-2 transition-colors ${
                tab === t
                  ? "border-green-600 text-green-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "search" ? "Existing guest" : "New number"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">

          {tab === "search" && (
            <>
              <label className="text-[12px] text-gray-500">Search by name or phone</label>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedGuest(null); }}
                placeholder="e.g. Rahul or +919..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                autoFocus
              />
              {(results.length > 0 || searching || (query.trim() && !searching)) && (
                <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[150px] overflow-y-auto">
                  {searching && (
                    <div className="text-[12px] text-gray-400 px-3 py-2">Searching…</div>
                  )}
                  {!searching && results.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGuest(g)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 border-b border-gray-50 last:border-0 transition-colors ${
                        selectedGuest?.id === g.id ? "bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-[11px] font-medium text-green-700 flex-shrink-0">
                        {(g.name ?? g.phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-800 truncate">
                          {g.name ?? "Guest"}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{g.phone}</div>
                      </div>
                      {selectedGuest?.id === g.id && (
                        <svg className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {!searching && results.length === 0 && query.trim() && (
                    <div className="text-[12px] text-gray-400 px-3 py-2">No guests found</div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "number" && (
            <>
              <label className="text-[12px] text-gray-500">Phone number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-[13px] outline-none focus:border-green-500 bg-white w-[100px] flex-shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="9876543210"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                  autoFocus
                />
              </div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest name (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
              />
            </>
          )}

          {error && (
            <p className="text-[12px] text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Opening…" : "Open chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
