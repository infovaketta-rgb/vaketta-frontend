import type { VariableDef } from "./types";

// ── advanced_room_allocation node — output schema ─────────────────────────────
//
// Single source of truth for the flowVars this node WRITES (outputs only — the
// guest counts/dates it reads as inputs are owned by upstream question nodes).
// Mirrors the backend writes in nodes/advancedRoomAllocation.ts:
//
// Available after the guest confirms the allocation (writeOutputContract):
//   bookingTotal, bookingTotalPrice*, bookingNights, roomCount,
//   bookingRoomTypeId, bookingRoomTypeName, bookingPricePerNight,
//   allocatedRooms, bookingRooms*
//   (* legacy back-compat alias — prefer the non-suffixed name in new flows)
//
// Available after guest-count collection, before allocation confirmation
// (reclassifyAndProceed — written before the confirm prompt is shown):
//   effectiveAdults, effectiveChildren, promotedToAdult, effectiveChildrenAges
//
// Available after plan selection, before confirmation (generateAndSendPlans):
//   preferredRoomTypeId, planCount
//
// Available after confirmation (finalizeAndAdvance, written once):
//   selectedPlanType
//
// Keep this list in sync with backend writes.

export const advancedRoomAllocationOutputs: VariableDef[] = [
  // ── Post-confirm booking outputs ─────────────────────────────────────────────
  { key: "bookingTotal",          type: "number", label: "Booking Total (₹)" },
  { key: "bookingTotalPrice",     type: "number", label: "Booking Total — legacy alias (₹)" },
  { key: "bookingNights",         type: "number", label: "Number of Nights" },
  { key: "roomCount",             type: "number", label: "Number of Rooms" },
  { key: "bookingRoomTypeId",     type: "string", label: "Primary Room Type ID" },
  { key: "bookingRoomTypeName",   type: "string", label: "Primary Room Type Name" },
  { key: "bookingPricePerNight",  type: "number", label: "Primary Room Price/Night (₹)" },
  { key: "allocatedRooms",        type: "array",  label: "Allocated Rooms (JSON)" },
  { key: "bookingRooms",          type: "array",  label: "Allocated Rooms — legacy alias (JSON)" },
  // ── Reclassification outputs (available before confirm prompt) ────────────────
  { key: "effectiveAdults",       type: "number", label: "Effective Adults (after age check)" },
  { key: "effectiveChildren",     type: "number", label: "Effective Children (after age check)" },
  { key: "promotedToAdult",       type: "number", label: "Guests Reclassified as Adults" },
  { key: "effectiveChildrenAges", type: "array",  label: "Children Ages (after reclassification)" },
  // ── Plan-selection outputs (available after plan selection) ───────────────────
  { key: "preferredRoomTypeId",   type: "string", label: "Guest's Preferred Room Type ID" },
  { key: "planCount",             type: "number", label: "Number of Plans Offered" },
  { key: "selectedPlanType",      type: "string", label: "Plan Type Guest Selected (BEST_VALUE / BEST_EXPERIENCE / YOUR_CHOICE)" },
];
