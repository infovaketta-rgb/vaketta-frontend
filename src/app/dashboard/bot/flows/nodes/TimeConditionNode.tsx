"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export default function TimeConditionNode({ selected }: NodeProps<any>) {
  return (
    <div
      className={`w-52 rounded-xl border bg-white shadow-sm transition ${
        selected ? "border-indigo-400 shadow-md" : "border-indigo-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-400" />

      <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
          🕐 Time Condition
        </span>
      </div>

      <div className="px-3 py-2 space-y-1.5 text-[10px] text-gray-500">
        <p className="italic">Routes by hotel business hours</p>
        <div className="space-y-1">
          {[
            { handle: "business_hours", label: "Business hours", color: "bg-green-400" },
            { handle: "after_hours",    label: "After hours",    color: "bg-amber-400" },
            { handle: "weekend",        label: "Weekend",        color: "bg-blue-400"  },
          ].map(({ handle, label, color }) => (
            <div key={handle} className="relative flex items-center justify-between pr-4">
              <span>{label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle}
                style={{ right: -8, top: "50%", transform: "translateY(-50%)" }}
                className={`!w-2.5 !h-2.5 ${color}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
