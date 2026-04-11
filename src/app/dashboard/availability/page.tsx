"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = 14;
const COL_W  = 80;   // px per day column
const LEFT_W = 180;  // px for room-type name column

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoomTypeRow {
  id:         string;
  name:       string;
  basePrice:  number;
  totalRooms: number;
}

interface CalendarCell {
  availableRooms: number;
  totalRooms:     number;
  bookedRooms:    number;
  price:          number;
  isOverridden:   boolean;
}

interface CalendarData {
  roomTypes: RoomTypeRow[];
  dates:     string[];
  cells:     Record<string, Record<string, CalendarCell>>;
}

interface EditModal {
  roomTypeId:     string;
  roomTypeName:   string;
  date:           string;
  availableRooms: number;
  price:          number;
  totalRooms:     number;
}

interface BulkForm {
  roomTypeId:     string;
  startDate:      string;
  endDate:        string;
  availableRooms: string;
  price:          string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(ds: string): boolean {
  return ds === toISO(new Date());
}

function cellColor(cell: CalendarCell): string {
  if (cell.availableRooms === 0)                      return "bg-red-50 border-red-200 text-red-700";
  if (cell.availableRooms < cell.totalRooms)          return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-emerald-50 border-emerald-200 text-emerald-700";
}

function cellDot(cell: CalendarCell): string {
  if (cell.availableRooms === 0)             return "bg-red-400";
  if (cell.availableRooms < cell.totalRooms) return "bg-amber-400";
  return "bg-emerald-400";
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const mounted = useMounted();

  const [windowStart, setWindowStart] = useState<Date>(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [calData,   setCalData]   = useState<CalendarData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);

  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [editForm,  setEditForm]  = useState({ availableRooms: "", price: "" });

  const [bulkOpen,  setBulkOpen]  = useState(false);
  const [bulkForm,  setBulkForm]  = useState<BulkForm>({
    roomTypeId: "", startDate: "", endDate: "", availableRooms: "", price: "",
  });
  const [bulkError, setBulkError] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // ── Data fetch ───────────────────────────────────────────────────────────────

  const fetchCalendar = useCallback(async (start: Date) => {
    setLoading(true);
    setError("");
    const end = addDays(start, DAYS);
    // Each call gets its own key; if windowStart changes before the response
    // arrives, the stale response is discarded via the closure comparison.
    const expectedStart = toISO(start);
    try {
      const data: CalendarData = await apiFetch(
        `/hotel-settings/availability/calendar?startDate=${expectedStart}&endDate=${toISO(end)}`
      );
      // Only apply result if windowStart hasn't changed while we were fetching
      setWindowStart((current) => {
        if (toISO(current) === expectedStart) setCalData(data);
        return current;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchCalendar(windowStart);
    apiFetch("/hotel-settings/availability/toggle")
      .then((d: any) => setAvailabilityEnabled(d.availabilityEnabled ?? false))
      .catch(() => {});
  }, [mounted, windowStart, fetchCalendar]);

  // ── Navigation ───────────────────────────────────────────────────────────────

  function goToday()    { const d = new Date(); d.setHours(0,0,0,0); setWindowStart(d); }
  function prevWindow() { setWindowStart((d) => addDays(d, -DAYS)); }
  function nextWindow() { setWindowStart((d) => addDays(d,  DAYS)); }

  // ── Toggle ───────────────────────────────────────────────────────────────────

  async function handleToggle() {
    setToggleSaving(true);
    try {
      const next = !availabilityEnabled;
      await apiFetch("/hotel-settings/availability/toggle", {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
      setAvailabilityEnabled(next);
    } catch { /* ignore */ }
    finally { setToggleSaving(false); }
  }

  // ── Cell edit ─────────────────────────────────────────────────────────────────

  function openCell(rt: RoomTypeRow, dateStr: string, cell: CalendarCell) {
    setEditModal({
      roomTypeId: rt.id, roomTypeName: rt.name,
      date: dateStr, totalRooms: cell.totalRooms,
      availableRooms: cell.availableRooms, price: cell.price,
    });
    setEditForm({ availableRooms: String(cell.availableRooms), price: String(cell.price) });
  }

  async function saveCell() {
    if (!editModal) return;
    setSaving(true);
    try {
      await apiFetch("/hotel-settings/availability/cell", {
        method: "PATCH",
        body: JSON.stringify({
          roomTypeId:     editModal.roomTypeId,
          date:           editModal.date,
          availableRooms: Number(editForm.availableRooms),
          price:          editForm.price !== "" ? Number(editForm.price) : null,
        }),
      });
      // Optimistic update
      setCalData((prev) => {
        if (!prev) return prev;
        const newCells = { ...prev.cells };
        newCells[editModal.roomTypeId] = { ...newCells[editModal.roomTypeId] };
        newCells[editModal.roomTypeId]![editModal.date] = {
          ...newCells[editModal.roomTypeId]![editModal.date]!,
          availableRooms: Number(editForm.availableRooms),
          price: editForm.price !== "" ? Number(editForm.price) : editModal.price,
          isOverridden: true,
        };
        return { ...prev, cells: newCells };
      });
      setEditModal(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Bulk edit ─────────────────────────────────────────────────────────────────

  async function saveBulk() {
    setBulkError("");
    if (!bulkForm.roomTypeId || !bulkForm.startDate || !bulkForm.endDate || bulkForm.availableRooms === "") {
      setBulkError("All fields except price are required.");
      return;
    }
    if (bulkForm.endDate <= bulkForm.startDate) {
      setBulkError("End date must be after start date.");
      return;
    }
    setBulkSaving(true);
    try {
      await apiFetch("/hotel-settings/availability/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          roomTypeId:     bulkForm.roomTypeId,
          startDate:      bulkForm.startDate,
          endDate:        bulkForm.endDate,
          availableRooms: Number(bulkForm.availableRooms),
          price:          bulkForm.price !== "" ? Number(bulkForm.price) : null,
        }),
      });
      setBulkOpen(false);
      setBulkForm({ roomTypeId: "", startDate: "", endDate: "", availableRooms: "", price: "" });
      fetchCalendar(windowStart);
    } catch (e: any) {
      setBulkError(e.message);
    } finally {
      setBulkSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const dates = Array.from({ length: DAYS }, (_, i) => toISO(addDays(windowStart, i)));
  const windowEnd = addDays(windowStart, DAYS - 1);
  const rangeLabel =
    windowStart.getMonth() === windowEnd.getMonth()
      ? `${MONTH_SHORT[windowStart.getMonth()]} ${windowStart.getDate()} – ${windowEnd.getDate()}, ${windowEnd.getFullYear()}`
      : `${MONTH_SHORT[windowStart.getMonth()]} ${windowStart.getDate()} – ${MONTH_SHORT[windowEnd.getMonth()]} ${windowEnd.getDate()}, ${windowEnd.getFullYear()}`;

  const inputCls = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A3F91]";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2B0D3E]">Availability Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set room counts and prices per day. Click any cell to edit.
          </p>
        </div>

        {/* Automation toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-[#2B0D3E]">Bot Availability Check</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {availabilityEnabled
                ? "Bot verifies room availability before confirming bookings"
                : "Bot collects booking info without checking availability"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggleSaving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none
              ${availabilityEnabled ? "bg-[#7A3F91]" : "bg-gray-200"} ${toggleSaving ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${availabilityEnabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevWindow}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-64 text-center text-sm font-semibold text-[#2B0D3E]">{rangeLabel}</span>
          <button
            onClick={nextWindow}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="ml-2 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Today
          </button>
        </div>

        {/* Legend + bulk button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> All available</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />  Partial</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />    Sold out</span>
          </div>
          <button
            onClick={() => { setBulkOpen(true); setBulkError(""); }}
            className="rounded-lg bg-[#7A3F91] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2B0D3E] transition"
          >
            Bulk Edit
          </button>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div style={{ minWidth: LEFT_W + DAYS * COL_W }}>

            {/* Header row */}
            <div className="flex border-b border-gray-200 bg-[#F2EAF7] sticky top-0 z-10">
              <div
                style={{ width: LEFT_W, minWidth: LEFT_W }}
                className="shrink-0 border-r border-gray-200 flex items-end px-4 pb-2"
              >
                <span className="text-[11px] font-semibold text-[#7A3F91] uppercase tracking-wide">Room Type</span>
              </div>
              {dates.map((ds) => {
                const d = new Date(ds + "T00:00:00");
                const tod = isToday(ds);
                const isBoundary = d.getDate() === 1;
                return (
                  <div
                    key={ds}
                    style={{ width: COL_W, minWidth: COL_W }}
                    className={`shrink-0 border-r border-gray-200 px-1 py-1.5 text-center relative
                      ${tod ? "bg-[#7A3F91]/10" : ""}`}
                  >
                    {isBoundary && <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400" />}
                    <div className={`text-[10px] font-medium mb-0.5 ${tod ? "text-[#7A3F91] font-bold" : "text-gray-400"}`}>
                      {isBoundary ? MONTH_SHORT[d.getMonth()] : DAY_SHORT[d.getDay()]}
                    </div>
                    <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                      ${tod ? "bg-[#7A3F91] text-white" : "text-gray-700"}`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room type rows */}
            {calData?.roomTypes.length === 0 && (
              <div className="flex">
                <div style={{ width: LEFT_W }} className="shrink-0 border-r border-gray-200" />
                <div className="flex-1 py-16 text-center text-sm text-gray-400">
                  No room types configured yet. Add room types to get started.
                </div>
              </div>
            )}

            {calData?.roomTypes.map((rt, ri) => (
              <div
                key={rt.id}
                className={`flex border-b border-gray-100 last:border-b-0 ${ri % 2 === 1 ? "bg-gray-50/40" : ""}`}
              >
                {/* Room type label */}
                <div
                  style={{ width: LEFT_W, minWidth: LEFT_W }}
                  className="shrink-0 border-r border-gray-200 flex flex-col justify-center px-4 py-3 gap-0.5"
                >
                  <span className="text-xs font-semibold text-[#2B0D3E] leading-snug">{rt.name}</span>
                  <span className="text-[10px] text-gray-400">{rt.totalRooms} room{rt.totalRooms !== 1 ? "s" : ""} · ₹{rt.basePrice.toLocaleString("en-IN")}/night</span>
                </div>

                {/* Day cells */}
                <div className="flex flex-1">
                  {dates.map((ds) => {
                    const cell = calData.cells[rt.id]?.[ds];
                    if (!cell) {
                      return (
                        <div
                          key={ds}
                          style={{ width: COL_W, minWidth: COL_W }}
                          className="shrink-0 border-r border-gray-100 p-1"
                        />
                      );
                    }
                    const tod = isToday(ds);
                    return (
                      <button
                        key={ds}
                        onClick={() => openCell(rt, ds, cell)}
                        style={{ width: COL_W, minWidth: COL_W }}
                        className={`shrink-0 border-r border-gray-100 p-1.5 text-center transition hover:ring-2 hover:ring-[#7A3F91] hover:z-10 relative
                          ${tod ? "bg-[#7A3F91]/5" : ""}`}
                      >
                        <div className={`rounded-md border py-1 px-1 ${cellColor(cell)}`}>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${cellDot(cell)}`} />
                            <span className="text-[11px] font-bold">
                              {cell.availableRooms}/{cell.totalRooms}
                            </span>
                          </div>
                          <div className="text-[10px] font-medium opacity-80">
                            ₹{cell.price.toLocaleString("en-IN")}
                          </div>
                          {cell.isOverridden && (
                            <div className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#7A3F91]" title="Custom override" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-right">
        Purple dot = custom override · Click any cell to edit · Use Bulk Edit for date ranges
      </p>

      {/* ── Cell edit modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#2B0D3E]">{editModal.roomTypeName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editModal.date}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Available rooms <span className="font-normal">(max {editModal.totalRooms})</span>
                </label>
                <input
                  type="number" min={0} max={editModal.totalRooms}
                  className={inputCls}
                  value={editForm.availableRooms}
                  onChange={(e) => setEditForm((f) => ({ ...f, availableRooms: e.target.value }))}
                />
                {/* Quick set buttons */}
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    onClick={() => setEditForm((f) => ({ ...f, availableRooms: "0" }))}
                    className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    Sold out
                  </button>
                  <button
                    onClick={() => setEditForm((f) => ({ ...f, availableRooms: String(editModal.totalRooms) }))}
                    className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-100 transition"
                  >
                    All available
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Price override <span className="font-normal">(leave empty to use base price)</span>
                </label>
                <input
                  type="number" min={0}
                  className={inputCls}
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder={`Base: ₹${editModal.price.toLocaleString("en-IN")}`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={saveCell}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#7A3F91] py-2 text-sm font-semibold text-white hover:bg-[#2B0D3E] transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk edit panel ── */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2B0D3E]">Bulk Edit Availability</h2>
              <button onClick={() => setBulkOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Room type</label>
                <select
                  className={inputCls}
                  value={bulkForm.roomTypeId}
                  onChange={(e) => setBulkForm((f) => ({ ...f, roomTypeId: e.target.value }))}
                >
                  <option value="">— select room type —</option>
                  {calData?.roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">From date</label>
                  <input type="date" className={inputCls}
                    value={bulkForm.startDate}
                    onChange={(e) => setBulkForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">To date (inclusive)</label>
                  <input type="date" className={inputCls}
                    value={bulkForm.endDate}
                    onChange={(e) => setBulkForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Available rooms {bulkForm.roomTypeId && calData && (() => {
                    const rt = calData.roomTypes.find((r) => r.id === bulkForm.roomTypeId);
                    return rt ? `(max ${rt.totalRooms})` : "";
                  })()}
                </label>
                <input type="number" min={0} className={inputCls}
                  value={bulkForm.availableRooms}
                  onChange={(e) => setBulkForm((f) => ({ ...f, availableRooms: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Price override <span className="font-normal">(optional)</span>
                </label>
                <input type="number" min={0} className={inputCls}
                  value={bulkForm.price}
                  onChange={(e) => setBulkForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Leave empty to keep current prices"
                />
              </div>

              {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={saveBulk}
                disabled={bulkSaving}
                className="flex-1 rounded-lg bg-[#7A3F91] py-2 text-sm font-semibold text-white hover:bg-[#2B0D3E] transition disabled:opacity-50"
              >
                {bulkSaving ? "Applying…" : "Apply to all dates"}
              </button>
              <button
                onClick={() => setBulkOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
