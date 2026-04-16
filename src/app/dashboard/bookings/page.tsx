"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import BookingCalendar from "@/components/BookingCalendar";
import { formatCurrency, formatDate } from "@/lib/locale";

const inputClass =
  "w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]";

export default function BookingsPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    guestName: "", roomTypeId: "", checkIn: "", checkOut: "",
    pricePerNight: "", advancePaid: "",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch("/bookings"),
      apiFetch("/room-types"),
    ]).then(([b, r]) => {
      setBookings(b);
      setRoomTypes(r);
    }).catch((err: any) => {
      setLoadError(err.message || "Failed to load bookings.");
    });
  }, [mounted]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await apiFetch(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (err) {
      console.error(err);
    }
    setOpenMenuId(null);
  }

  function openEdit(booking: any) {
    setEditingBooking(booking);
    setEditForm({
      guestName: booking.guestName || "",
      roomTypeId: booking.roomTypeId || "",
      checkIn: booking.checkIn?.slice(0, 10) || "",
      checkOut: booking.checkOut?.slice(0, 10) || "",
      pricePerNight: String(booking.pricePerNight || ""),
      advancePaid: String(booking.advancePaid || ""),
    });
    setEditError("");
    setOpenMenuId(null);
  }

  async function handleEdit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!editingBooking) return;
    setEditError("");
    setEditLoading(true);
    try {
      const updated = await apiFetch(`/bookings/${editingBooking.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          guestName: editForm.guestName,
          roomTypeId: editForm.roomTypeId,
          checkIn: editForm.checkIn,
          checkOut: editForm.checkOut,
          pricePerNight: Number(editForm.pricePerNight),
          advancePaid: Number(editForm.advancePaid),
        }),
      });
      setBookings((prev) => prev.map((b) => (b.id === editingBooking.id ? updated : b)));
      setEditingBooking(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update booking.");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-[#F4F2ED]">
      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0C1B33]">Bookings</h1>
        <div className="flex rounded-lg border border-[#E5E0D4] overflow-hidden text-sm bg-white">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 transition ${view === "list" ? "bg-[#1B52A8] text-white" : "text-[#0C1B33]/60 hover:bg-[#F4F2ED]"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 transition ${view === "calendar" ? "bg-[#1B52A8] text-white" : "text-[#0C1B33]/60 hover:bg-[#F4F2ED]"}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {view === "calendar" && (
        <BookingCalendar
          bookings={bookings}
          roomTypes={roomTypes}
          onBookingClick={openEdit}
        />
      )}

      {view === "list" && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E0D4]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E5E0D4] bg-[#F4F2ED]">
              <tr className="text-left text-[#0C1B33]/55 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-3 rounded-tl-xl">Reference</th>
                <th className="px-6 py-3">Guest</th>
                <th className="px-6 py-3">Room</th>
                <th className="px-6 py-3">Check In</th>
                <th className="px-6 py-3">Check Out</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Advance</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 rounded-tr-xl" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D4]">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-[#0C1B33]/40">
                    No bookings yet.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-no-nav]")) return;
                    router.push(`/dashboard/bookings/${b.id}`);
                  }}
                  className="hover:bg-[#F4F2ED]/60 transition cursor-pointer"
                >
                  <td className="px-6 py-3">
                    {b.referenceNumber ? (
                      <span className="font-mono text-xs font-semibold text-[#1B52A8] bg-[#1B52A8]/8 px-2 py-1 rounded-md">
                        {b.referenceNumber}
                      </span>
                    ) : (
                      <span className="text-[#0C1B33]/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-medium text-[#0C1B33]">
                    {b.guestName || b.guest?.name}
                  </td>
                  <td className="px-6 py-3 text-[#0C1B33]/70">{b.roomType?.name}</td>
                  <td className="px-6 py-3 text-[#0C1B33]/65">
                    {formatDate(b.checkIn)}
                  </td>
                  <td className="px-6 py-3 text-[#0C1B33]/65">
                    {formatDate(b.checkOut)}
                  </td>
                  <td className="px-6 py-3 text-[#B8912E] font-semibold">
                    {formatCurrency(b.totalPrice ?? 0)}
                  </td>
                  <td className="px-6 py-3 text-[#0C1B33]/65">
                    {formatCurrency(b.advancePaid ?? 0)}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-3 relative" data-no-nav>
                    {b.status !== "CANCELLED" && (
                      <div ref={openMenuId === b.id ? menuRef : undefined} data-no-nav>
                        <button
                          data-no-nav
                          onClick={() => setOpenMenuId(openMenuId === b.id ? null : b.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F4F2ED] text-[#0C1B33]/50 transition"
                        >
                          ⋮
                        </button>

                        {openMenuId === b.id && (
                          <div data-no-nav className="absolute right-6 top-10 z-50 w-36 bg-white border border-[#E5E0D4] rounded-xl shadow-lg py-1 overflow-hidden">
                            <button
                              data-no-nav
                              onClick={() => openEdit(b)}
                              className="w-full text-left px-4 py-2 text-sm text-[#0C1B33] hover:bg-[#F4F2ED] transition"
                            >
                              Edit
                            </button>
                            {b.status === "PENDING" && (
                              <button
                                data-no-nav
                                onClick={() => updateStatus(b.id, "CONFIRMED")}
                                className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              data-no-nav
                              onClick={() => updateStatus(b.id, "CANCELLED")}
                              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#0C1B33]">Edit Booking</h2>
              <button
                onClick={() => setEditingBooking(null)}
                className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={editForm.guestName}
                  onChange={(e) => setEditForm((f) => ({ ...f, guestName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Room Type</label>
                <select
                  value={editForm.roomTypeId}
                  onChange={(e) => {
                    const rt = roomTypes.find((r) => r.id === e.target.value);
                    setEditForm((f) => ({
                      ...f,
                      roomTypeId: e.target.value,
                      pricePerNight: rt ? String(rt.basePrice) : f.pricePerNight,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select room type</option>
                  {roomTypes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — ₹{r.basePrice}/night
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Check In</label>
                  <input
                    type="date"
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Check Out</label>
                  <input
                    type="date"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Price / Night (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.pricePerNight}
                    onChange={(e) => setEditForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.advancePaid}
                    onChange={(e) => setEditForm((f) => ({ ...f, advancePaid: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-medium text-white hover:bg-[#163F82] transition disabled:opacity-50"
                >
                  {editLoading ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
