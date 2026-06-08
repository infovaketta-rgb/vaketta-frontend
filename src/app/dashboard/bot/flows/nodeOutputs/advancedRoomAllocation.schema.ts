import type { VariableDef } from "./types";

// ── advanced_room_allocation node — output schema ─────────────────────────────
//
// Single source of truth for the flowVars this node WRITES (outputs only — the
// guest counts/dates it reads as inputs are owned by upstream question nodes).
// Mirrors the backend writes in nodes/advancedRoomAllocation.ts:
//   - writeOutputContract():  bookingTotal, roomCount, bookingNights,
//                             bookingRoomTypeId/Name, bookingPricePerNight,
//                             allocatedRooms (= bookingRooms JSON)
//   - reclassifyAndProceed(): effectiveAdults, effectiveChildren,
//                             promotedToAdult, effectiveChildrenAges
//
// Keep this list in sync with those writes.

export const advancedRoomAllocationOutputs: VariableDef[] = [
  { key: "bookingTotal",          type: "number", label: "Booking Total (₹)" },
  { key: "roomCount",             type: "number", label: "Number of Rooms" },
  { key: "bookingNights",         type: "number", label: "Number of Nights" },
  { key: "effectiveAdults",       type: "number", label: "Effective Adults" },
  { key: "effectiveChildren",     type: "number", label: "Effective Children" },
  { key: "promotedToAdult",       type: "number", label: "Guests Reclassified as Adults" },
  { key: "effectiveChildrenAges", type: "array",  label: "Children Ages (after reclassification)" },
  { key: "bookingRoomTypeName",   type: "string", label: "Primary Room Type" },
  { key: "bookingPricePerNight",  type: "number", label: "Primary Room Price/Night (₹)" },
  { key: "allocatedRooms",        type: "array",  label: "Allocated Rooms" },
];
