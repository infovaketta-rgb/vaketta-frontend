import type { Node, Edge } from "@xyflow/react";
import type { VariableDef } from "./types";
import { nodeOutputs, SYSTEM_VARIABLES } from "./registry";

export type VarGroup = {
  sourceId:    string;   // "" for the System group
  sourceLabel: string;   // shown as the group heading in the picker
  vars:        VariableDef[];
};

// Friendly per-type group label, matching the palette's wording.
const TYPE_LABEL: Record<string, string> = {
  advanced_room_allocation: "Room Allocator",
  question:                 "Question",
  show_rooms:               "Show Rooms",
  action:                   "Action",
  check_availability:       "Check Availability",
};

function sourceLabel(node: Node): string {
  const explicit = (node.data as Record<string, unknown>)?.label;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  return TYPE_LABEL[node.type ?? ""] ?? (node.type ?? "Node");
}

/**
 * Walk the flow graph backward from `targetId`, collecting every ancestor node.
 * Pure BFS over reversed edges; cycle-safe via a visited set.
 */
function ancestorIds(targetId: string, edges: Edge[]): Set<string> {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e.source);
  }
  const seen = new Set<string>();
  const queue = [...(incoming.get(targetId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const parent of incoming.get(id) ?? []) {
      if (!seen.has(parent)) queue.push(parent);
    }
  }
  return seen;
}

/**
 * Variables available to `targetId`, grouped by source node. Includes the
 * always-available System group first, then one group per ancestor node that
 * declares outputs (in flow order — closest ancestors are not specially ranked;
 * we keep node array order for stability).
 */
export function collectUpstreamVars(
  targetId: string,
  nodes:    Node[],
  edges:    Edge[],
): VarGroup[] {
  const groups: VarGroup[] = [];

  // System group — always present.
  groups.push({ sourceId: "", sourceLabel: "System", vars: SYSTEM_VARIABLES });

  const ancestors = ancestorIds(targetId, edges);
  for (const node of nodes) {
    if (!ancestors.has(node.id)) continue;
    const vars = nodeOutputs(node.type ?? "", (node.data ?? {}) as Record<string, unknown>);
    if (vars.length === 0) continue;
    groups.push({ sourceId: node.id, sourceLabel: sourceLabel(node), vars });
  }

  return groups;
}
