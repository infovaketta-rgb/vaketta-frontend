"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

const ROUTES = [
  { handle: "business_hours", label: "Business hours", dot: "bg-green-400"  },
  { handle: "after_hours",    label: "After hours",    dot: "bg-amber-400"  },
  { handle: "weekend",        label: "Weekend",        dot: "bg-blue-400"   },
] as const;

export default function TimeConditionNode({ selected }: NodeProps<any>) {
  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-indigo-200 hover:border-indigo-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-indigo-400!" />
      <div className="rounded-t-[10px] bg-indigo-50 border-b border-indigo-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">🕐</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Time Condition</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-[10px] text-gray-400 italic">Routes by hotel business hours</p>
        <div className="space-y-1">
          {ROUTES.map(({ handle, label, dot }) => (
            <div key={handle} className="relative flex items-center justify-between pr-4">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[10px] text-gray-600">{label}</span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={handle}
                style={{ right: -8, top: "50%", transform: "translateY(-50%)" }}
                className={`w-2.5! h-2.5! ${dot}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
