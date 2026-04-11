"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { CheckAvailabilityNodeData } from "../types";

export default function CheckAvailabilityNode({ data, selected }: NodeProps<any>) {
  const d = data as CheckAvailabilityNodeData;
  return (
    <div
      className={`w-56 rounded-xl border shadow-sm transition ${
        selected ? "border-teal-400 shadow-md" : "border-teal-200"
      } bg-teal-50`}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-500" />

      <div className="border-b border-teal-100 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
          📅 Check Availability
        </span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {d?.roomTypeIdVar && (
          <div className="flex items-center gap-1 text-[10px] text-teal-700">
            <span className="font-medium text-teal-400">Room</span>
            <span className="font-mono bg-teal-100 rounded px-1">{`{{${d.roomTypeIdVar}}}`}</span>
          </div>
        )}
        {d?.checkInVar && d?.checkOutVar && (
          <div className="flex items-center gap-1 text-[10px] text-teal-700">
            <span className="font-medium text-teal-400">Dates</span>
            <span className="font-mono bg-teal-100 rounded px-1">{d.checkInVar}</span>
            <span className="text-teal-300">→</span>
            <span className="font-mono bg-teal-100 rounded px-1">{d.checkOutVar}</span>
          </div>
        )}
      </div>

      {/* Two labelled source handles */}
      <div className="flex justify-between px-3 pb-2 text-[9px] font-bold">
        <span className="text-green-600">✓ Available</span>
        <span className="text-red-500">✗ Unavailable</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="available"
        style={{ left: "25%" }}
        className="!bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="unavailable"
        style={{ left: "75%" }}
        className="!bg-red-400"
      />
    </div>
  );
}
