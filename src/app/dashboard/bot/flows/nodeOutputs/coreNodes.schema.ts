import type { VariableDef, NodeOutputSchema } from "./types";

// ── Output schemas for the built-in nodes that write flowVars ─────────────────
// These mirror the ad-hoc derivation that used to live inline in the canvas
// page (definedVars). Centralising them here makes the registry the single
// source of truth for the variable picker.

// question — writes one var named by `variableName`.
export const questionOutputs: NodeOutputSchema = (data) => {
  const name = (data.variableName as string) || "";
  if (!name) return [];
  return [{ key: name, type: "string", label: `Answer: ${name}` }];
};

// show_rooms — writes "<prefix>TypeId/TypeName/Price" plus the booking defaults.
export const showRoomsOutputs: NodeOutputSchema = (data) => {
  const prefix = (data.variableName as string) || "";
  const out: VariableDef[] = [];
  if (prefix) {
    out.push(
      { key: `${prefix}TypeId`,   type: "string", label: `${prefix} — Room Type ID` },
      { key: `${prefix}TypeName`, type: "string", label: `${prefix} — Room Type Name` },
      { key: `${prefix}Price`,    type: "number", label: `${prefix} — Price/Night (₹)` },
    );
  }
  out.push(
    { key: "bookingRoomTypeId",    type: "string", label: "Booking Room Type ID" },
    { key: "bookingRoomTypeName",  type: "string", label: "Booking Room Type Name" },
    { key: "bookingPricePerNight", type: "number", label: "Booking Price/Night (₹)" },
  );
  return out;
};

// action(create_booking) — writes the booking reference contract.
export const actionOutputs: NodeOutputSchema = (data) => {
  if ((data.actionType as string) !== "create_booking") return [];
  return [
    { key: "bookingRef",    type: "string", label: "Booking Reference" },
    { key: "bookingStatus", type: "string", label: "Booking Status" },
    { key: "bookingId",     type: "string", label: "Booking ID" },
  ];
};

// check_availability — writes the availability result + count.
export const checkAvailabilityOutputs: VariableDef[] = [
  { key: "availabilityResult", type: "string", label: "Availability Result" },
  { key: "availabilityCount",  type: "number", label: "Available Rooms Count" },
];
