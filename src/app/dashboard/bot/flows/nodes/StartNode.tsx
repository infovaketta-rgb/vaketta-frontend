"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export default function StartNode({ data, selected }: NodeProps<any>) {
  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-green-300 hover:border-green-500"
    }`}>
      <div className="rounded-t-[10px] bg-green-500 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none text-white">▶</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white">Start</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-gray-500 italic truncate">
          {data?.label || "Flow entry point"}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-green-700!" />
    </div>
  );
}
