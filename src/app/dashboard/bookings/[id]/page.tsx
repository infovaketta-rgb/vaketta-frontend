"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useToastStore } from "@/store/toastStore";
import { formatCurrency, formatDate } from "@/lib/locale";
import ConfirmBookingModal from "@/components/ConfirmBookingModal";

const inputClass =
  "w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]";

export default function BookingDetailPage() {
  const mounted       = useMounted();
  const router        = useRouter();
  const { id }        = useParams() as { id: string };
  const { addToast }  = useToastStore();

  const [booking,   setBooking]   = useState<any | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [actioning, setActioning] = useState(false);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Edit modal state
  const [editing,     setEditing]     = useState(false);
  const [editStep,    setEditStep]    = useState<"select" | "fields">("select");
  // Booking-level fields (always editable)
  const [editHeader, setEditHeader] = useState({ guestName: "", checkIn: "", checkOut: "", advancePaid: "" });
  // Which room IDs the user selected to edit (step 1)
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  // Per-room edits: roomId → { roomTypeId, pricePerNight }
  const [roomEdits, setRoomEdits] = useState<Record<string, { roomTypeId: string; pricePerNight: string }>>({});
  // Single-room path (no children)
  const [editForm, setEditForm] = useState({ roomTypeId: "", pricePerNight: "" });
  const [applyPriceToAll, setApplyPriceToAll] = useState(false);
  const [editError,   setEditError]   = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch(`/bookings/${id}`),
      apiFetch("/room-types"),
    ])
      .then(([b, r]) => { setBooking(b); setRoomTypes(r); })
      .catch((e: any) => setError(e.message || "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [mounted, id]);

  const isGroupBooking = (booking?.rooms?.length ?? 0) > 0;

  function openEdit() {
    setEditHeader({
      guestName:   booking.guestName  || "",
      checkIn:     booking.checkIn?.slice(0, 10)  || "",
      checkOut:    booking.checkOut?.slice(0, 10) || "",
      advancePaid: String(booking.advancePaid ?? ""),
    });
    if (isGroupBooking) {
      // Pre-fill per-room edits from current values
      const initial: Record<string, { roomTypeId: string; pricePerNight: string }> = {};
      for (const r of booking.rooms) {
        initial[r.id] = { roomTypeId: r.roomTypeId, pricePerNight: String(r.pricePerNight) };
      }
      setRoomEdits(initial);
      setSelectedRoomIds(new Set());
      setEditStep("select");
    } else {
      setEditForm({ roomTypeId: booking.roomTypeId || "", pricePerNight: String(booking.pricePerNight || "") });
      setEditStep("fields");
    }
    setApplyPriceToAll(false);
    setEditError("");
    setEditing(true);
  }

  async function handleEdit(e: React.SyntheticEvent) {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    try {
      let body: Record<string, unknown> = {
        guestName:   editHeader.guestName,
        checkIn:     editHeader.checkIn,
        checkOut:    editHeader.checkOut,
        advancePaid: Number(editHeader.advancePaid),
      };

      if (isGroupBooking) {
        // Build rooms array for selected rooms
        const roomsPayload = [...selectedRoomIds].map((rid) => {
          const edit = roomEdits[rid]!;
          return { id: rid, roomTypeId: edit.roomTypeId, pricePerNight: Number(edit.pricePerNight) };
        });
        // "Apply price to all" overrides price on every room
        if (applyPriceToAll && selectedRoomIds.size === 1) {
          const price = Number(roomEdits[[...selectedRoomIds][0]!]?.pricePerNight ?? 0);
          body.rooms = booking.rooms.map((r: any) => ({ id: r.id, pricePerNight: price, roomTypeId: roomEdits[r.id]?.roomTypeId ?? r.roomTypeId }));
        } else {
          body.rooms = roomsPayload;
        }
      } else {
        body.roomTypeId    = editForm.roomTypeId;
        body.pricePerNight = Number(editForm.pricePerNight);
      }

      const updated = await apiFetch(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setBooking(updated);
      setEditing(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update booking.");
    } finally {
      setEditLoading(false);
    }
  }

  async function changeStatus(status: string) {
    setActioning(true);
    try {
      await apiFetch(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBooking((prev: any) => ({ ...prev, status }));
    } catch (e: any) {
      addToast(e.message || "Failed to update status", "error");
    } finally {
      setActioning(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F4F2ED]">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B52A8]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#F4F2ED]">
        <p className="text-sm text-red-500">{error || "Booking not found"}</p>
        <button
          onClick={() => router.push("/dashboard/bookings")}
          className="text-sm text-[#1B52A8] hover:underline"
        >
          ← Back to Bookings
        </button>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const balance = (booking.totalPrice ?? 0) - (booking.advancePaid ?? 0);
  const phone   = booking.guest?.phone ?? "";

  return (
    <div className="h-full overflow-y-auto bg-[#F4F2ED] p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/bookings")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0D4] bg-white text-[#0C1B33]/60 hover:bg-[#F4F2ED] transition text-sm"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0C1B33]">Booking Detail</h1>
              {booking.referenceNumber && (
                <span className="font-mono text-xs font-semibold text-[#1B52A8] bg-[#1B52A8]/8 px-2 py-1 rounded-md">
                  {booking.referenceNumber}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#0C1B33]/40">
              Created {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Left — 2 cols */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Guest card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Guest
            </p>
            <p className="text-lg font-bold text-[#0C1B33]">
              {booking.guestName || booking.guest?.name || "—"}
            </p>
            {phone && (
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-sm text-[#0C1B33]/60">{phone}</span>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Stay details card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Stay Details
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-[#0C1B33]/50">
                  {booking.rooms?.length > 0 ? "Rooms" : "Room Type"}
                </dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">
                  {booking.rooms?.length > 0
                    ? `${booking.rooms.length} room${booking.rooms.length !== 1 ? "s" : ""}`
                    : (booking.roomType?.name ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Duration</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{nights} night{nights !== 1 ? "s" : ""}</dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Check-in</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{formatDate(booking.checkIn)}</dd>
              </div>
              <div>
                <dt className="text-[#0C1B33]/50">Check-out</dt>
                <dd className="mt-0.5 font-medium text-[#0C1B33]">{formatDate(booking.checkOut)}</dd>
              </div>
            </dl>

            {/* Per-room breakdown for group bookings */}
            {booking.rooms?.length > 0 && (
              <div className="mt-4 border-t border-[#E5E0D4] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
                  Room Breakdown
                </p>
                <div className="flex flex-col gap-2">
                  {booking.rooms.map((r: any, i: number) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div className="text-[#0C1B33]/70">
                        <span className="font-medium text-[#0C1B33]">
                          Room {i + 1} — {r.roomType?.name ?? "Room"}
                        </span>
                        <span className="ml-2 text-xs text-[#0C1B33]/50">
                          {r.adults} adult{r.adults !== 1 ? "s" : ""}
                          {r.children > 0 ? `, ${r.children} child${r.children !== 1 ? "ren" : ""}` : ""}
                          {r.extraBed ? " + extra bed" : ""}
                        </span>
                      </div>
                      <span className="font-medium text-[#0C1B33]">
                        {formatCurrency(r.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Payment
            </p>
            <div className="flex flex-col gap-2 text-sm">
              {booking.rooms?.length > 0 ? (
                // Group booking — show subtotals per room then grand total
                <>
                  {booking.rooms.map((r: any, i: number) => (
                    <Row
                      key={r.id}
                      label={`Room ${i + 1} (${r.roomType?.name ?? "Room"}) ${formatCurrency(r.pricePerNight)}/night × ${nights} night${nights !== 1 ? "s" : ""}`}
                      value={formatCurrency(r.totalPrice)}
                    />
                  ))}
                </>
              ) : (
                // Single-room booking — existing behaviour
                <>
                  <Row label="Price per night" value={formatCurrency(booking.pricePerNight ?? 0)} />
                  <Row
                    label={`${nights} night${nights !== 1 ? "s" : ""} × ${formatCurrency(booking.pricePerNight ?? 0)}`}
                    value={formatCurrency(booking.totalPrice ?? 0)}
                  />
                </>
              )}
              <hr className="border-[#E5E0D4] my-1" />
              <Row
                label="Total"
                value={formatCurrency(booking.totalPrice ?? 0)}
                valueClass="font-bold text-[#B8912E]"
              />
              <Row
                label="Advance paid"
                value={formatCurrency(booking.advancePaid ?? 0)}
                valueClass="text-emerald-600 font-medium"
              />
              <hr className="border-[#E5E0D4] my-1" />
              <Row
                label="Balance due"
                value={formatCurrency(balance)}
                valueClass={balance > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}
              />
            </div>
          </div>
        </div>

        {/* Right — 1 col */}
        <div className="flex flex-col gap-4">

          {/* Actions card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Actions
            </p>
            <div className="flex flex-col gap-2">
              {booking.status !== "CANCELLED" && (
                <>
                  <ActionButton
                    label="Edit Booking"
                    onClick={openEdit}
                    disabled={actioning}
                    className="border border-[#E5E0D4] text-[#0C1B33] hover:bg-[#F4F2ED]"
                  />
                  <hr className="border-[#E5E0D4]" />
                </>
              )}
              {booking.status === "PENDING" && (
                <>
                  <ActionButton
                    label="Confirm"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={actioning}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  />
                  <ActionButton
                    label="Hold"
                    onClick={() => changeStatus("HOLD")}
                    disabled={actioning}
                    className="bg-sky-500 text-white hover:bg-sky-600"
                  />
                  <ActionButton
                    label="Cancel"
                    onClick={() => changeStatus("CANCELLED")}
                    disabled={actioning}
                    className="border border-red-300 text-red-600 hover:bg-red-50"
                  />
                </>
              )}
              {booking.status === "HOLD" && (
                <>
                  <ActionButton
                    label="Confirm"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={actioning}
                    className="bg-emerald-500 text-white hover:bg-emerald-600"
                  />
                  <ActionButton
                    label="Cancel"
                    onClick={() => changeStatus("CANCELLED")}
                    disabled={actioning}
                    className="border border-red-300 text-red-600 hover:bg-red-50"
                  />
                </>
              )}
              {booking.status === "CONFIRMED" && (
                <ActionButton
                  label="Cancel"
                  onClick={() => changeStatus("CANCELLED")}
                  disabled={actioning}
                  className="border border-red-300 text-red-600 hover:bg-red-50"
                />
              )}
              {booking.status === "CANCELLED" && (
                <p className="text-xs text-[#0C1B33]/40">No actions available.</p>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
              Info
            </p>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="text-[#0C1B33]/40 mb-0.5">Booking ID</p>
                <p className="font-mono text-[#0C1B33]/70 break-all">{booking.id}</p>
              </div>
              {booking.referenceNumber && (
                <div>
                  <p className="text-[#0C1B33]/40 mb-0.5">Reference</p>
                  <p className="font-mono font-semibold text-[#1B52A8]">{booking.referenceNumber}</p>
                </div>
              )}
              <div>
                <p className="text-[#0C1B33]/40 mb-0.5">Status</p>
                <StatusBadge status={booking.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm booking modal */}
      {confirmModalOpen && booking && (
        <ConfirmBookingModal
          bookingId={booking.id}
          // Keep the modal open after send so staff can watch live per-step status;
          // just patch the booking status. Modal closes via onClose.
          onDone={() => {
            setBooking((prev: any) => ({ ...prev, status: "CONFIRMED" }));
          }}
          onClose={() => setConfirmModalOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E5E0D4] shrink-0">
              <div className="flex items-center gap-3">
                {isGroupBooking && editStep === "fields" && (
                  <button
                    onClick={() => setEditStep("select")}
                    className="text-[#1B52A8] text-sm hover:underline"
                  >
                    ← Back
                  </button>
                )}
                <h2 className="text-base font-semibold text-[#0C1B33]">
                  {isGroupBooking
                    ? editStep === "select" ? "Select Rooms to Edit" : "Edit Booking"
                    : "Edit Booking"}
                </h2>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <form id="edit-form" onSubmit={handleEdit} className="flex flex-col gap-4">

                {/* ── Booking-level fields (always shown) ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40 mb-3">
                    Booking Details
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Guest Name</label>
                      <input
                        type="text"
                        value={editHeader.guestName}
                        onChange={(e) => setEditHeader((h) => ({ ...h, guestName: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Check In</label>
                        <input
                          type="date"
                          value={editHeader.checkIn}
                          onChange={(e) => setEditHeader((h) => ({ ...h, checkIn: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Check Out</label>
                        <input
                          type="date"
                          value={editHeader.checkOut}
                          onChange={(e) => setEditHeader((h) => ({ ...h, checkOut: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Advance Paid (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editHeader.advancePaid}
                        onChange={(e) => setEditHeader((h) => ({ ...h, advancePaid: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Group booking: step 1 — room selection ── */}
                {isGroupBooking && editStep === "select" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40">
                        Rooms
                      </p>
                      <button
                        type="button"
                        className="text-xs text-[#1B52A8] hover:underline"
                        onClick={() => {
                          const allIds = new Set<string>(booking.rooms.map((r: any) => r.id as string));
                          setSelectedRoomIds(
                            selectedRoomIds.size === booking.rooms.length ? new Set() : allIds
                          );
                        }}
                      >
                        {selectedRoomIds.size === booking.rooms.length ? "Deselect all" : "Select all rooms"}
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {booking.rooms.map((r: any, i: number) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-3 rounded-lg border border-[#E5E0D4] px-4 py-3 cursor-pointer hover:bg-[#F4F2ED] transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.has(r.id)}
                            onChange={() => {
                              setSelectedRoomIds((prev) => {
                                const next = new Set(prev);
                                next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                                return next;
                              });
                            }}
                            className="accent-[#1B52A8] w-4 h-4 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0C1B33]">
                              Room {i + 1} — {r.roomType?.name ?? "Room"}
                            </p>
                            <p className="text-xs text-[#0C1B33]/50 mt-0.5">
                              {r.adults} adult{r.adults !== 1 ? "s" : ""}
                              {r.children > 0 ? `, ${r.children} child${r.children !== 1 ? "ren" : ""}` : ""}
                              {r.extraBed ? " + extra bed" : ""}
                              {" · "}₹{r.pricePerNight.toLocaleString("en-IN")}/night
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Group booking: step 2 — per-room fields ── */}
                {isGroupBooking && editStep === "fields" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/40 mb-3">
                      Room Edits
                      {selectedRoomIds.size > 1 && (
                        <span className="ml-1 normal-case font-normal text-[#0C1B33]/40">
                          — changes apply to all {selectedRoomIds.size} selected rooms
                        </span>
                      )}
                    </p>
                    {booking.rooms
                      .filter((r: any) => selectedRoomIds.has(r.id))
                      .map((r: any, i: number) => {
                        const edit = roomEdits[r.id] ?? { roomTypeId: r.roomTypeId, pricePerNight: String(r.pricePerNight) };
                        const isFirst = i === 0;
                        return (
                          <div key={r.id} className="mb-4">
                            {selectedRoomIds.size > 1 && (
                              <p className="text-xs font-medium text-[#0C1B33]/60 mb-2">
                                Room {booking.rooms.findIndex((x: any) => x.id === r.id) + 1} — {r.roomType?.name ?? "Room"}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Room Type</label>
                                <select
                                  value={edit.roomTypeId}
                                  onChange={(e) => {
                                    const rt = roomTypes.find((x) => x.id === e.target.value);
                                    const newPrice = rt ? String(rt.basePrice) : edit.pricePerNight;
                                    if (selectedRoomIds.size > 1) {
                                      // Bulk: apply to all selected rooms
                                      setRoomEdits((prev) => {
                                        const next = { ...prev };
                                        for (const rid of selectedRoomIds) {
                                          next[rid] = { ...next[rid]!, roomTypeId: e.target.value, pricePerNight: newPrice };
                                        }
                                        return next;
                                      });
                                    } else {
                                      setRoomEdits((prev) => ({ ...prev, [r.id]: { ...edit, roomTypeId: e.target.value, pricePerNight: newPrice } }));
                                    }
                                  }}
                                  className={inputClass}
                                >
                                  {roomTypes.map((x) => (
                                    <option key={x.id} value={x.id}>{x.name} — ₹{x.basePrice}/night</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Price / Night (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={edit.pricePerNight}
                                  onChange={(e) => {
                                    if (selectedRoomIds.size > 1) {
                                      setRoomEdits((prev) => {
                                        const next = { ...prev };
                                        for (const rid of selectedRoomIds) {
                                          next[rid] = { ...next[rid]!, pricePerNight: e.target.value };
                                        }
                                        return next;
                                      });
                                    } else {
                                      setRoomEdits((prev) => ({ ...prev, [r.id]: { ...edit, pricePerNight: e.target.value } }));
                                    }
                                  }}
                                  className={inputClass}
                                />
                              </div>
                            </div>
                            {/* "Apply to all" shortcut — only when exactly 1 room selected */}
                            {selectedRoomIds.size === 1 && isFirst && (
                              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={applyPriceToAll}
                                  onChange={(e) => setApplyPriceToAll(e.target.checked)}
                                  className="accent-[#1B52A8] w-4 h-4"
                                />
                                <span className="text-xs text-[#0C1B33]/60">Apply this price to all rooms in booking</span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* ── Single-room booking fields ── */}
                {!isGroupBooking && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Room Type</label>
                      <select
                        value={editForm.roomTypeId}
                        onChange={(e) => {
                          const rt = roomTypes.find((r) => r.id === e.target.value);
                          setEditForm((f) => ({ ...f, roomTypeId: e.target.value, pricePerNight: rt ? String(rt.basePrice) : f.pricePerNight }));
                        }}
                        className={inputClass}
                      >
                        <option value="">Select room type</option>
                        {roomTypes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name} — ₹{r.basePrice}/night</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Price / Night (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.pricePerNight}
                        onChange={(e) => setEditForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {editError && <p className="text-xs text-red-600">{editError}</p>}
              </form>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 pt-4 border-t border-[#E5E0D4] shrink-0">
              {isGroupBooking && editStep === "select" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={selectedRoomIds.size === 0}
                    onClick={() => setEditStep("fields")}
                    className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-medium text-white hover:bg-[#163F82] transition disabled:opacity-40"
                  >
                    Continue ({selectedRoomIds.size} room{selectedRoomIds.size !== 1 ? "s" : ""} selected)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    form="edit-form"
                    disabled={editLoading}
                    className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-medium text-white hover:bg-[#163F82] transition disabled:opacity-50"
                  >
                    {editLoading ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  valueClass = "text-[#0C1B33]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#0C1B33]/55">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING:   "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    HOLD:      "bg-sky-100 text-sky-700",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
