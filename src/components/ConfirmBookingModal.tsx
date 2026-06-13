"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";

interface MessageOption {
  id: string;
  name: string;
  language?: string;
  category?: string | null;
  bodyPreview: string;
}

interface OptionsResponse {
  channel: string;
  options: MessageOption[];
  defaultId?: string | null;
}

interface Props {
  bookingId: string;
  onDone: () => void;
  onClose: () => void;
}

function WhatsAppBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      WhatsApp
    </span>
  );
}

function InstagramBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
      style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
      Instagram
    </span>
  );
}

const selectClass =
  "w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-sm text-[#0C1B33] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]";

export default function ConfirmBookingModal({ bookingId, onDone, onClose }: Props) {
  const { addToast } = useToastStore();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsErr,     setOptionsErr]     = useState("");
  const [channel,        setChannel]        = useState<string>("");
  const [options,        setOptions]        = useState<MessageOption[]>([]);

  // selectedId tracks the currently chosen option; preview is its interpolated body
  const [selectedId,  setSelectedId]  = useState<string>("");
  const [preview,     setPreview]     = useState<string>("");
  const [loadingPrev, setLoadingPrev] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Track the id that was loaded into `preview` so we only re-fetch on real changes
  const loadedPreviewFor = useRef<string>("");
  const previewAbort     = useRef<AbortController | null>(null);

  // Guard: don't fetch if bookingId is falsy (defensive, callers should gate this)
  useEffect(() => {
    if (!bookingId) {
      console.warn("[ConfirmBookingModal] bookingId is falsy — skipping fetch");
      setLoadingOptions(false);
      setOptionsErr("No booking selected.");
      return;
    }

    apiFetch(`/bookings/${bookingId}/confirm-options`)
      .then((data: OptionsResponse) => {
        setChannel(data.channel);
        setOptions(data.options);
        if (data.options.length > 0) {
          // Prefer the hotel's saved default; fall back to first option
          const preferred = data.defaultId
            ? (data.options.find((o) => o.id === data.defaultId) ?? data.options[0]!)
            : data.options[0]!;
          setSelectedId(preferred.id);
          setPreview(preferred.bodyPreview);
          loadedPreviewFor.current = preferred.id;
        }
      })
      .catch((e: any) => setOptionsErr(e.message || "Failed to load message options"))
      .finally(() => setLoadingOptions(false));
  }, [bookingId]);

  // Fetch a fresh preview when the selection changes to an id we haven't loaded yet
  useEffect(() => {
    // Skip: no id, no channel yet, or already loaded for this id
    if (!selectedId || !channel || !bookingId || loadedPreviewFor.current === selectedId) return;

    previewAbort.current?.abort();
    const ctrl = new AbortController();
    previewAbort.current = ctrl;

    const param = channel === "INSTAGRAM"
      ? `savedReplyId=${encodeURIComponent(selectedId)}`
      : `templateId=${encodeURIComponent(selectedId)}`;

    setLoadingPrev(true);
    apiFetch(`/bookings/${bookingId}/confirm-preview?${param}`)
      .then((d: { messagePreview: string | null }) => {
        if (ctrl.signal.aborted) return;
        setPreview(d.messagePreview ?? "");
        loadedPreviewFor.current = selectedId;
      })
      .catch(() => { /* keep previous preview on error */ })
      .finally(() => { if (!ctrl.signal.aborted) setLoadingPrev(false); });

    return () => ctrl.abort();
  }, [selectedId, channel, bookingId]);

  async function submit(sendMessage: boolean) {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { sendMessage };
      if (sendMessage && selectedId) {
        if (channel === "INSTAGRAM") body.savedReplyId = selectedId;
        else body.templateId = selectedId;
      }
      await apiFetch(`/bookings/${bookingId}/confirm`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      addToast(sendMessage ? "Booking confirmed and message sent" : "Booking confirmed", "success");
      onDone();
    } catch (e: any) {
      addToast(e.message || "Failed to confirm booking", "error");
      setSubmitting(false);
    }
  }

  const noOptions   = !loadingOptions && !optionsErr && options.length === 0;
  const sendDisabled = submitting || loadingOptions || !!optionsErr || noOptions || !selectedId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E0D4]">
          <h2 className="text-base font-semibold text-[#0C1B33]">Confirm Booking</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {loadingOptions && (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B52A8]" />
            </div>
          )}

          {optionsErr && (
            <p className="text-sm text-red-500">{optionsErr}</p>
          )}

          {!loadingOptions && !optionsErr && (
            <>
              {/* Channel badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#0C1B33]/50">Channel:</span>
                {channel === "INSTAGRAM" ? <InstagramBadge /> : <WhatsAppBadge />}
              </div>

              {/* ── WhatsApp template selector ── */}
              {channel === "WHATSAPP" && (
                noOptions ? (
                  <p className="text-sm text-[#0C1B33]/50">
                    No approved WhatsApp templates found. Approve a template to send a message.
                  </p>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1.5">
                      WhatsApp Template
                    </label>
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      disabled={submitting}
                      className={selectClass}
                    >
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}{o.language ? ` (${o.language})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}

              {/* ── Instagram saved reply selector ── */}
              {channel === "INSTAGRAM" && (
                noOptions ? (
                  <p className="text-sm text-[#0C1B33]/50">
                    No saved replies configured. Add one in Settings to send a message.
                  </p>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1.5">
                      Saved Reply
                    </label>
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      disabled={submitting}
                      className={selectClass}
                    >
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}{o.category ? ` — ${o.category}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}

              {/* Preview pane — shown whenever a selection exists */}
              {selectedId && (
                <div className="rounded-xl border border-[#E5E0D4] bg-[#F4F2ED] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40 mb-2">
                    Message Preview
                  </p>
                  {loadingPrev ? (
                    <div className="space-y-2">
                      <div className="h-3 w-full animate-pulse rounded bg-[#E5E0D4]" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-[#E5E0D4]" />
                    </div>
                  ) : (
                    <p className="text-sm text-[#0C1B33] whitespace-pre-wrap leading-relaxed">
                      {preview}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
          <button
            onClick={() => submit(true)}
            disabled={sendDisabled}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {submitting ? "Confirming…" : "Confirm & Send Message"}
          </button>
          <button
            onClick={() => submit(false)}
            disabled={submitting || loadingOptions}
            className="w-full rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition disabled:opacity-50"
          >
            Confirm Only
          </button>
        </div>

      </div>
    </div>
  );
}
