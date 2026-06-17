"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { useSocket } from "@/context/SocketContext";

type RefType = "TEMPLATE" | "SAVED_REPLY";
type StepStatus = "idle" | "sending" | "sent" | "failed" | "skipped";

interface TemplateVariable {
  name:         string;
  defaultValue: string;   // auto-derived from the booking; "" → staff must fill
}

interface PreviewStep {
  stepId:  string;
  refType: RefType;
  refId:   string;
  title:   string;
  body:    string;
  variables?: TemplateVariable[];   // TEMPLATE steps only
}

interface PreviewResponse {
  channel: string;
  source:  "sequence" | "legacy";
  sequenceId?: string;
  steps:   PreviewStep[];
}

interface Props {
  bookingId: string;
  onDone: () => void;
  onClose: () => void;
}

// Per-step UI state: whether staff included it, live send status, and the current
// (auto-derived + staff-edited) values for any template variables.
interface StepState extends PreviewStep {
  checked:   boolean;
  status:    StepStatus;
  error?:    string;
  varValues: Record<string, string>;
}

// "guestName" → "Guest Name" for friendlier field labels.
function varLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// Variables a TEMPLATE step needs that staff must fill (no auto-derived default).
function missingVars(s: StepState): string[] {
  if (s.refType !== "TEMPLATE" || !s.variables) return [];
  return s.variables.filter((v) => !(s.varValues[v.name] ?? "").trim()).map((v) => v.name);
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

function TypeBadge({ refType }: { refType: RefType }) {
  return refType === "TEMPLATE" ? (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Template</span>
  ) : (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Saved Reply</span>
  );
}

function StatusPill({ status, error }: { status: StepStatus; error?: string }) {
  switch (status) {
    case "sending":
      return <span className="text-[11px] text-amber-600 inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" /> Sending…
      </span>;
    case "sent":
      return <span className="text-[11px] font-medium text-emerald-600">✓ Sent</span>;
    case "skipped":
      return <span className="text-[11px] text-slate-400">Skipped</span>;
    case "failed":
      return <span className="text-[11px] font-medium text-red-500" title={error}>✕ Failed</span>;
    default:
      return null;
  }
}

export default function ConfirmBookingModal({ bookingId, onDone, onClose }: Props) {
  const { addToast } = useToastStore();
  const socket = useSocket();

  const [loading,    setLoading]    = useState(true);
  const [loadErr,    setLoadErr]    = useState("");
  const [channel,    setChannel]    = useState<string>("");
  const [steps,      setSteps]      = useState<StepState[]>([]);

  const [sending,    setSending]    = useState(false);
  const [sentOnce,   setSentOnce]   = useState(false);  // a send has been started
  const [allDone,    setAllDone]    = useState(false);

  // Reconcile local checklist with the server's authoritative job status. Called on
  // mount (recover an in-flight/finished send if the modal was reopened) and on every
  // socket reconnect (catch up on step events missed while disconnected).
  async function reconcileStatus() {
    try {
      const st = await apiFetch(`/bookings/${bookingId}/confirmation-status`);
      if (st?.state === "not_found" || !Array.isArray(st.steps) || st.steps.length === 0) return;

      // A job exists for this booking — a send already happened. Reflect its per-step
      // status and lock the form (no re-submit into an unsent state).
      setSentOnce(true);
      const byId: Record<string, { status: string; error?: string }> = {};
      for (const s of st.steps) byId[s.stepId] = { status: s.status, error: s.error };

      setSteps((prev) => prev.map((s) => {
        const r = byId[s.stepId];
        if (!r) return s;
        // "pending" maps to our "idle" placeholder; everything else maps 1:1.
        const status = (r.status === "pending" ? "sending" : r.status) as StepStatus;
        return { ...s, checked: r.status !== "skipped", status, error: r.error };
      }));

      if (st.state === "completed" || st.state === "failed") {
        setAllDone(true);
        setSending(false);
      } else if (st.inFlight) {
        setSending(true);
      }
    } catch {
      /* status is best-effort recovery — ignore failures, live events still apply */
    }
  }

  // Load the confirmation preview (sequence or legacy single-message fallback), then
  // reconcile against any existing job for this booking.
  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setLoadErr("No booking selected.");
      return;
    }
    apiFetch(`/bookings/${bookingId}/confirmation-preview`)
      .then(async (data: PreviewResponse) => {
        setChannel(data.channel);
        setSteps(data.steps.map((s) => ({
          ...s,
          checked: true,
          status:  "idle" as StepStatus,
          // Seed each template variable with its auto-derived default.
          varValues: Object.fromEntries((s.variables ?? []).map((v) => [v.name, v.defaultValue])),
        })));
        await reconcileStatus();
      })
      .catch((e: any) => setLoadErr(e?.message || "Failed to load confirmation preview"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Live per-step status via the hotel-scoped Socket.IO room, plus a re-sync on
  // reconnect so events emitted during a disconnect aren't lost.
  useEffect(() => {
    if (!socket) return;

    function onStep(payload: any) {
      if (payload?.bookingId !== bookingId) return;
      setSteps((prev) => prev.map((s) =>
        s.stepId === payload.stepId
          ? { ...s, status: payload.status as StepStatus, error: payload.error }
          : s
      ));
    }
    function onDoneEvt(payload: any) {
      if (payload?.bookingId !== bookingId) return;
      setAllDone(true);
      setSending(false);
    }
    // Socket.IO client fires "reconnect" on the manager after a successful reconnect.
    function onReconnect() { reconcileStatus(); }

    socket.on("confirmation:step", onStep);
    socket.on("confirmation:done", onDoneEvt);
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.off("confirmation:step", onStep);
      socket.off("confirmation:done", onDoneEvt);
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, bookingId]);

  function toggle(stepId: string) {
    setSteps((prev) => prev.map((s) => s.stepId === stepId ? { ...s, checked: !s.checked } : s));
  }

  function setVarValue(stepId: string, name: string, value: string) {
    setSteps((prev) => prev.map((s) =>
      s.stepId === stepId ? { ...s, varValues: { ...s.varValues, [name]: value } } : s
    ));
  }

  async function handleSend() {
    setSending(true);
    setSentOnce(true);
    try {
      await apiFetch(`/bookings/${bookingId}/send-confirmation`, {
        method: "POST",
        body: JSON.stringify({
          steps: steps.map((s) => ({
            stepId:  s.stepId,
            refType: s.refType,
            refId:   s.refId,
            skip:    !s.checked,
            // Send the full (auto-derived + edited) variable map for TEMPLATE steps.
            ...(s.refType === "TEMPLATE" && s.variables?.length ? { variables: s.varValues } : {}),
          })),
        }),
      });
      // Mark unchecked steps as skipped immediately; checked ones await socket events.
      setSteps((prev) => prev.map((s) => s.checked ? { ...s, status: "sending" } : { ...s, status: "skipped" }));
      addToast("Booking confirmed — sending messages…", "success");
      onDone();  // refresh the bookings list (status is now CONFIRMED)
    } catch (e: any) {
      // 409 → a send is already in flight for this booking (double-submit guard).
      if (e?.status === 409) {
        addToast("A confirmation is already being sent for this booking.", "warning");
        setSentOnce(true);          // keep the form locked
        await reconcileStatus();    // show the existing job's live progress
        return;
      }
      addToast(e?.message || "Failed to start confirmation send", "error");
      setSending(false);
      setSentOnce(false);
    }
  }

  const noSteps      = !loading && !loadErr && steps.length === 0;
  const checkedCount = steps.filter((s) => s.checked).length;
  const failedCount  = steps.filter((s) => s.status === "failed").length;
  // A checked template step with an unfilled required variable blocks the whole send.
  const hasMissingVars = steps.some((s) => s.checked && missingVars(s).length > 0);
  const sendDisabled = sending || loading || !!loadErr || noSteps || checkedCount === 0 || sentOnce || hasMissingVars;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E0D4] shrink-0">
          <h2 className="text-base font-semibold text-[#0C1B33]">Confirm Booking</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B52A8]" />
            </div>
          )}

          {loadErr && <p className="text-sm text-red-500">{loadErr}</p>}

          {noSteps && (
            <p className="text-sm text-[#0C1B33]/50">
              No confirmation message is configured for this {channel === "INSTAGRAM" ? "Instagram" : "WhatsApp"} booking.
              You can still confirm the booking without sending a message.
            </p>
          )}

          {!loading && !loadErr && steps.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#0C1B33]/50">Channel:</span>
                {channel === "INSTAGRAM" ? <InstagramBadge /> : <WhatsAppBadge />}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
                Messages to send ({checkedCount} of {steps.length})
              </p>

              <ul className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <li key={s.stepId}
                      className={`rounded-xl border p-3 transition ${
                        s.status === "failed" ? "border-red-200 bg-red-50/50" : "border-[#E5E0D4] bg-white"
                      }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={s.checked}
                        disabled={sentOnce}
                        onChange={() => toggle(s.stepId)}
                        className="mt-0.5 h-4 w-4 rounded accent-emerald-500 disabled:opacity-50"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-300">{i + 1}.</span>
                          <TypeBadge refType={s.refType} />
                          <span className="text-[13px] font-medium text-[#0C1B33] truncate">{s.title}</span>
                          <span className="ml-auto"><StatusPill status={s.status} error={s.error} /></span>
                        </div>
                        {s.body && (
                          <p className="mt-1 text-[12px] text-[#0C1B33]/60 whitespace-pre-wrap line-clamp-3">{s.body}</p>
                        )}

                        {/* Template variable inputs — only those NOT auto-derived from
                            the booking (empty default). Hidden once a send has started. */}
                        {s.checked && !sentOnce && s.refType === "TEMPLATE" &&
                          (s.variables ?? []).filter((v) => !v.defaultValue).length > 0 && (
                          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-[#E5E0D4] bg-[#F4F2ED] p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0C1B33]/40">
                              Fill in template variables
                            </p>
                            {(s.variables ?? []).filter((v) => !v.defaultValue).map((v) => {
                              const val   = s.varValues[v.name] ?? "";
                              const empty = !val.trim();
                              return (
                                <div key={v.name}>
                                  <label className="block text-[11px] font-medium text-[#0C1B33]/70 mb-0.5">
                                    {varLabel(v.name)} <span className="text-red-400">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => setVarValue(s.stepId, v.name, e.target.value)}
                                    placeholder={v.name}
                                    className={`w-full rounded-md border px-2 py-1 text-[12px] text-[#0C1B33] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 ${
                                      empty ? "border-red-300" : "border-[#E5E0D4] focus:border-[#1B52A8]"
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {s.status === "failed" && (
                          <p className="mt-1 text-[11px] text-red-500">{s.error || "Send failed."} The other steps were not affected.</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {allDone && failedCount > 0 && (
                <p className="text-[12px] text-amber-600">
                  Finished with {failedCount} failed step{failedCount > 1 ? "s" : ""}. The booking is confirmed.
                </p>
              )}
              {allDone && failedCount === 0 && (
                <p className="text-[12px] text-emerald-600">All messages sent. The booking is confirmed.</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-2 shrink-0 border-t border-[#E5E0D4]">
          {!sentOnce ? (
            <button
              onClick={handleSend}
              disabled={sendDisabled}
              className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {sending ? "Sending…"
                : noSteps ? "No messages to send"
                : hasMissingVars ? "Fill required template fields"
                : `Confirm & Send ${checkedCount} message${checkedCount === 1 ? "" : "s"}`}
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={sending && !allDone}
              className="w-full rounded-lg bg-[#1B52A8] py-2 text-sm font-medium text-white hover:bg-[#164088] transition disabled:opacity-50"
            >
              {allDone ? "Done" : "Sending… (you can close)"}
            </button>
          )}
          {!sentOnce && (
            <button
              onClick={onClose}
              disabled={sending}
              className="w-full rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
