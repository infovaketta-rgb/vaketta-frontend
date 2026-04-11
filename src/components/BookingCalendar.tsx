"use client";

import { useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS_SHOWN = 14;          // visible day columns
const COL_W      = 48;          // px per day column
const LEFT_W     = 168;         // px — room-type name column
const BAR_H      = 28;          // px — booking bar height
const BAR_GAP    = 4;           // px — vertical gap between stacked bars
const ROW_PAD_T  = 10;          // px — top padding inside a row before first bar
const ROW_PAD_B  = 8;           // px — bottom padding

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Bar colours — solid, like Booking.com
const BAR_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  CONFIRMED: { bg: "bg-emerald-500",  border: "border-emerald-600", text: "text-white"       },
  PENDING:   { bg: "bg-amber-400",    border: "border-amber-500",   text: "text-amber-950"   },
  HOLD:      { bg: "bg-blue-400",     border: "border-blue-500",    text: "text-white"        },
  CANCELLED: { bg: "bg-gray-300",     border: "border-gray-400",    text: "text-gray-500"    },
};

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  PENDING:   "bg-amber-100   text-amber-800   border border-amber-200",
  HOLD:      "bg-blue-100    text-blue-800    border border-blue-200",
  CANCELLED: "bg-gray-100    text-gray-500    border border-gray-200",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  guestName?: string;
  guest?: { name: string };
  roomType?: { name: string };
  roomTypeId?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice?: number;
  advancePaid?: number;
}

interface RoomType {
  id: string;
  name: string;
}

interface Props {
  bookings: Booking[];
  roomTypes: RoomType[];
  onBookingClick: (b: Booking) => void;
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function s0(d: Date | string): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

/** Greedy lane assignment so overlapping bookings stack without collision. */
function assignLanes(roomBookings: Booking[]): { booking: Booking; lane: number }[] {
  const sorted = [...roomBookings].sort(
    (a, b) => s0(a.checkIn).getTime() - s0(b.checkIn).getTime()
  );
  const laneEnd: Date[] = [];
  return sorted.map((booking) => {
    const ci = s0(booking.checkIn);
    let lane = laneEnd.findIndex((e) => e <= ci);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(new Date(0));
    }
    laneEnd[lane] = s0(booking.checkOut);
    return { booking, lane };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BookingCalendar({ bookings, roomTypes, onBookingClick }: Props) {
  const [rangeStart, setRangeStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const rangeEnd = addDays(rangeStart, DAYS_SHOWN);
  const dates    = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(rangeStart, i));

  // Build room rows — prefer roomTypes prop; fall back to unique rooms from bookings
  const rows: RoomType[] =
    roomTypes.length > 0
      ? roomTypes
      : Array.from(
          new Map(
            bookings
              .filter((b) => b.roomType)
              .map((b) => [
                b.roomTypeId ?? b.roomType!.name,
                { id: b.roomTypeId ?? b.roomType!.name, name: b.roomType!.name },
              ])
          ).values()
        );

  // Group bookings by roomTypeId, filtered to visible date range
  const byRoom: Record<string, Booking[]> = Object.fromEntries(rows.map((r) => [r.id, []]));
  for (const b of bookings) {
    const rid = b.roomTypeId ?? "";
    if (byRoom[rid] && s0(b.checkIn) < rangeEnd && s0(b.checkOut) > rangeStart) {
      byRoom[rid].push(b);
    }
  }

  // Overall stats (all bookings, not range-filtered)
  const counts: Record<string, number> = {};
  for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;

  // Range label
  const last     = addDays(rangeStart, DAYS_SHOWN - 1);
  const rangeLabel =
    rangeStart.getMonth() === last.getMonth()
      ? `${MONTH_SHORT[rangeStart.getMonth()]} ${rangeStart.getDate()} – ${last.getDate()}, ${last.getFullYear()}`
      : `${MONTH_SHORT[rangeStart.getMonth()]} ${rangeStart.getDate()} – ${MONTH_SHORT[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;

  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setRangeStart(d);
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRangeStart((d) => addDays(d, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
            aria-label="Previous week"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="min-w-52 text-center text-sm font-semibold text-[#2B0D3E]">
            {rangeLabel}
          </span>

          <button
            onClick={() => setRangeStart((d) => addDays(d, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
            aria-label="Next week"
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

        {/* Status counts */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([status, n]) => (
              <span
                key={status}
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {n} {status[0] + status.slice(1).toLowerCase()}
              </span>
            ))}
        </div>
      </div>

      {/* ── Timeline grid ── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: LEFT_W + DAYS_SHOWN * COL_W }}>

          {/* Date header row */}
          <div className="flex border-b border-gray-200 bg-[#F2EAF7] sticky top-0 z-10">
            {/* Corner cell */}
            <div
              style={{ width: LEFT_W, minWidth: LEFT_W }}
              className="shrink-0 border-r border-gray-200 flex items-end px-4 pb-2"
            >
              <span className="text-[11px] font-semibold text-[#7A3F91] uppercase tracking-wide">
                Room Type
              </span>
            </div>

            {/* Day columns */}
            {dates.map((date, i) => {
              const tod         = isToday(date);
              const isMonthBoundary = date.getDate() === 1 && i > 0;
              return (
                <div
                  key={i}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className={`shrink-0 border-r border-gray-200 px-0.5 py-1.5 text-center relative
                    ${tod ? "bg-[#7A3F91]/10" : ""}`}
                >
                  {isMonthBoundary && (
                    <div className="absolute -left-px top-0 bottom-0 w-px bg-gray-400" />
                  )}
                  <div
                    className={`text-[10px] font-medium leading-none mb-1 ${
                      tod ? "text-[#7A3F91] font-bold" : "text-gray-400"
                    }`}
                  >
                    {isMonthBoundary
                      ? MONTH_SHORT[date.getMonth()]
                      : DAY_SHORT[date.getDay()]}
                  </div>
                  <div
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      tod ? "bg-[#7A3F91] text-white" : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room type rows */}
          {rows.map((rt, ri) => {
            const laned    = assignLanes(byRoom[rt.id] ?? []);
            const maxLane  = laned.length ? Math.max(...laned.map((l) => l.lane)) : -1;
            const numLanes = maxLane + 1;
            const rowH     = Math.max(52, ROW_PAD_T + numLanes * (BAR_H + BAR_GAP) + ROW_PAD_B);

            return (
              <div
                key={rt.id}
                className={`flex border-b border-gray-100 last:border-b-0 ${
                  ri % 2 === 1 ? "bg-gray-50/40" : ""
                }`}
              >
                {/* Room type name */}
                <div
                  style={{ width: LEFT_W, minWidth: LEFT_W, height: rowH }}
                  className="shrink-0 border-r border-gray-200 flex items-center px-4 py-2"
                >
                  <span className="text-xs font-semibold text-[#2B0D3E] leading-snug line-clamp-2">
                    {rt.name}
                  </span>
                </div>

                {/* Day cells + booking bars */}
                <div className="relative flex-1" style={{ height: rowH }}>

                  {/* Background grid — day columns */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {dates.map((date, i) => {
                      const tod      = isToday(date);
                      const isWkend  = date.getDay() === 0 || date.getDay() === 6;
                      const isBoundary = date.getDate() === 1 && i > 0;
                      return (
                        <div
                          key={i}
                          style={{ width: COL_W, minWidth: COL_W }}
                          className={`h-full shrink-0 border-r border-gray-100 relative ${
                            tod     ? "bg-[#7A3F91]/5"  :
                            isWkend ? "bg-gray-100/60"  : ""
                          }`}
                        >
                          {isBoundary && (
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Booking bars */}
                  {laned.map(({ booking, lane }) => {
                    const ci       = s0(booking.checkIn);
                    const co       = s0(booking.checkOut);
                    const visStart = ci < rangeStart ? rangeStart : ci;
                    const visEnd   = co > rangeEnd   ? rangeEnd   : co;
                    const leftDays  = (visStart.getTime() - rangeStart.getTime()) / 86_400_000;
                    const widthDays = (visEnd.getTime()   - visStart.getTime())   / 86_400_000;
                    if (widthDays <= 0) return null;

                    const isStartVis = ci.getTime() >= rangeStart.getTime();
                    const isEndVis   = co.getTime() <= rangeEnd.getTime();
                    const name       = booking.guestName || booking.guest?.name || "Guest";
                    const col        = BAR_COLOR[booking.status] ?? BAR_COLOR.PENDING;
                    const hovered    = hoveredId === booking.id;

                    return (
                      <button
                        key={booking.id}
                        onMouseEnter={() => setHoveredId(booking.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onBookingClick(booking)}
                        title={`${name} · ${booking.checkIn.slice(0, 10)} → ${booking.checkOut.slice(0, 10)} · ${booking.status}`}
                        style={{
                          position: "absolute",
                          left:   leftDays  * COL_W + 2,
                          width:  widthDays * COL_W - 4,
                          top:    ROW_PAD_T + lane * (BAR_H + BAR_GAP),
                          height: BAR_H,
                          zIndex: hovered ? 10 : 1,
                        }}
                        className={`flex items-center gap-1.5 px-2.5 text-[11px] font-semibold border transition
                          ${isStartVis ? "rounded-l-md" : ""}
                          ${isEndVis   ? "rounded-r-md" : ""}
                          ${col.bg} ${col.border} ${col.text}
                          ${hovered ? "shadow-md brightness-105" : ""}`}
                      >
                        {/* Check-in indicator */}
                        {isStartVis && (
                          <span className="shrink-0 opacity-70 text-[9px]">▶</span>
                        )}
                        <span className="truncate">{name}</span>
                        {/* Check-out indicator */}
                        {isEndVis && widthDays > 1 && (
                          <span className="shrink-0 opacity-70 text-[9px] ml-auto">◀</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Empty row placeholder */}
                  {laned.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-start pl-3">
                      <span className="text-[10px] text-gray-300 italic">available</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* No room types */}
          {rows.length === 0 && (
            <div className="flex">
              <div style={{ width: LEFT_W }} className="shrink-0 border-r border-gray-200" />
              <div className="flex-1 py-16 text-center text-sm text-gray-400">
                No room types found.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-3">
        {Object.entries(BAR_COLOR).map(([status, col]) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
            <span className={`inline-block h-3 w-6 rounded-sm border ${col.bg} ${col.border}`} />
            {status[0] + status.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">← → navigate by week · click bar to edit</span>
      </div>
    </div>
  );
}
