"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ActionNodeData } from "../types";

const ACTION_META: Record<string, { label: string; icon: string; cls: string }> = {
  create_booking:        { label: "Create Booking",       icon: "✅", cls: "bg-green-100 text-green-800" },
  update_booking_status: { label: "Update Booking",       icon: "🔄", cls: "bg-cyan-100 text-cyan-800" },
  start_booking_flow:    { label: "Start Booking (legacy)", icon: "📅", cls: "bg-orange-100 text-orange-700" },
  handoff_to_staff:      { label: "Handoff to Staff",     icon: "👤", cls: "bg-purple-100 text-purple-800" },
  notify_staff:          { label: "Notify Staff",         icon: "🔔", cls: "bg-violet-100 text-violet-800" },
  reset_to_menu:         { label: "Reset to Menu",        icon: "🏠", cls: "bg-gray-100 text-gray-700" },
  set_variable:          { label: "Set Variable",         icon: "📝", cls: "bg-yellow-100 text-yellow-800" },
  send_review_request:   { label: "Request Review",       icon: "⭐", cls: "bg-amber-100 text-amber-800" },
  view_bookings:         { label: "View Bookings",        icon: "📋", cls: "bg-blue-100 text-blue-800" },
};

export default function ActionNode({ data, selected }: NodeProps<any>) {
  const d    = data as ActionNodeData;
  const meta = ACTION_META[d?.actionType ?? ""] ?? { label: d?.actionType ?? "Action", icon: "⚡", cls: "bg-orange-100 text-orange-700" };

  return (
    <div
      className={`w-52 rounded-xl border shadow-sm transition ${
        selected ? "border-orange-400 shadow-md" : "border-orange-200"
      } bg-orange-50`}
    >
      <Handle type="target" position={Position.Top} className="bg-orange-400!" />
      <div className="border-b border-orange-100 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
          ⚡ Action
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
          {meta.icon} {meta.label}
        </span>

        {/* Extra details per action type */}
        {d?.actionType === "set_variable" && d?.variableToSet && (
          <p className="text-[10px] text-orange-700 font-mono">
            {d.variableToSet} = {d.valueToSet || "…"}
          </p>
        )}
        {d?.actionType === "update_booking_status" && d?.newStatus && (
          <p className="text-[10px] text-orange-700">→ {d.newStatus}</p>
        )}
        {d?.message && (
          <p className="line-clamp-1 text-[10px] text-orange-600 italic">{d.message}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-orange-400!" />
    </div>
  );
}
