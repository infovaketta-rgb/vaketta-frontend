"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { CheckAvailabilityNodeData } from "../types";

export default function CheckAvailabilityNode({ data, selected }: NodeProps<any>) {
  const d = data as CheckAvailabilityNodeData;
  return (
    <div className={`w-56 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-teal-200 hover:border-teal-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-teal-500!" />
      <div className="rounded-t-[10px] bg-teal-50 border-b border-teal-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">📅</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Check Availability</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {d?.roomTypeIdVar && (
          <div className="flex items-center gap-1 text-[10px] text-teal-700">
            <span className="text-teal-400 font-medium">Room</span>
            <span className="font-mono bg-teal-50 rounded px-1 border border-teal-100">{`{{${d.roomTypeIdVar}}}`}</span>
          </div>
        )}
        {d?.checkInVar && d?.checkOutVar && (
          <div className="flex items-center gap-1 text-[10px] text-teal-700 flex-wrap">
            <span className="text-teal-400 font-medium">Dates</span>
            <span className="font-mono bg-teal-50 rounded px-1 border border-teal-100">{d.checkInVar}</span>
            <span className="text-teal-300">→</span>
            <span className="font-mono bg-teal-50 rounded px-1 border border-teal-100">{d.checkOutVar}</span>
          </div>
        )}
        {!d?.roomTypeIdVar && !d?.checkInVar && (
          <p className="text-[11px] italic text-teal-300">Configure variables in inspector</p>
        )}
      </div>
      <div className="flex justify-between px-3 pb-2 text-[9px] font-bold">
        <span className="text-green-600">✓ Available</span>
        <span className="text-red-500">✗ Unavailable</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="available"
        style={{ left: "25%" }}
        className="bg-green-500!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="unavailable"
        style={{ left: "75%" }}
        className="bg-red-400!"
      />
    </div>
  );
}
