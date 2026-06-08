import type { NodeType } from "../types";
import type { VariableDef, NodeOutputSchema } from "./types";
import { advancedRoomAllocationOutputs } from "./advancedRoomAllocation.schema";
import {
  questionOutputs,
  showRoomsOutputs,
  actionOutputs,
  checkAvailabilityOutputs,
} from "./coreNodes.schema";
import { SYSTEM_VARS } from "../NodePalette";

// ── Node output registry ──────────────────────────────────────────────────────
//
// Maps a node type to its output schema (static list or data-dependent fn). This
// is the single source of truth for the variable picker — schemas are imported
// from each node's co-located *.schema.ts, never hand-maintained here.

const REGISTRY: Partial<Record<NodeType, NodeOutputSchema>> = {
  advanced_room_allocation: advancedRoomAllocationOutputs,
  question:                 questionOutputs,
  show_rooms:               showRoomsOutputs,
  action:                   actionOutputs,
  check_availability:       checkAvailabilityOutputs,
};

/** System variables available in every flow, exposed as typed VariableDefs. */
export const SYSTEM_VARIABLES: VariableDef[] = SYSTEM_VARS.map((sv) => ({
  key:   sv.name,
  type:  "string" as const,
  label: sv.desc,
}));

/** Resolve a single node's declared outputs (empty if the node writes nothing). */
export function nodeOutputs(type: string, data: Record<string, unknown>): VariableDef[] {
  const schema = REGISTRY[type as NodeType];
  if (!schema) return [];
  return typeof schema === "function" ? schema(data) : schema;
}

/** True if a variable type can't be substituted raw into a text string. */
export function isComplexType(t: VariableDef["type"]): boolean {
  return t === "array" || t === "object";
}
