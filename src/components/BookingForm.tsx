"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const inputClass =
  "w-full rounded-lg border border-[#E5E0D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]";

export default function BookingForm({ guestId, onClose }: {
  guestId: string;
  onClose: () => void;
}) {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/room-types").then(setRoomTypes).catch(console.error);
  }, []);

  // Auto-fill base price when room type changes
  function handleRoomTypeChange(id: string) {
    setRoomTypeId(id);
    const rt = roomTypes.find((r) => r.id === id);
    if (rt) setPricePerNight(String(rt.basePrice));
    else setPricePerNight("");
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");

    if (!guestName.trim()) return setError("Guest name is required.");
    if (!roomTypeId) return setError("Please select a room type.");
    if (!checkIn || !checkOut) return setError("Check-in and check-out dates are required.");
    if (new Date(checkOut) <= new Date(checkIn)) return setError("Check-out must be after check-in.");

    setLoading(true);
    try {
      await apiFetch("/bookings/create", {
        method: "POST",
        body: JSON.stringify({
          guestId,
          guestName,
          roomTypeId,
          checkIn,
          checkOut,
          ...(pricePerNight ? { pricePerNight: Number(pricePerNight) } : {}),
          ...(advancePaid ? { advancePaid: Number(advancePaid) } : {}),
        }),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0C1B33]">Create Booking</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Guest Name</label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Room Type</label>
            <select
              value={roomTypeId}
              onChange={(e) => handleRoomTypeChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a room type</option>
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
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">Check Out</label>
              <input
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">
                Price / Night (₹) <span className="text-slate-400">optional</span>
              </label>
              <input
                type="number"
                min={0}
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                placeholder="Auto from room type"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#0C1B33]/60 mb-1">
                Advance Paid (₹) <span className="text-slate-400">optional</span>
              </label>
              <input
                type="number"
                min={0}
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#1B52A8] py-2 text-sm font-medium text-white hover:bg-[#163F82] transition disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Booking"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E5E0D4] py-2 text-sm font-medium text-[#0C1B33]/70 hover:bg-[#F4F2ED] transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
