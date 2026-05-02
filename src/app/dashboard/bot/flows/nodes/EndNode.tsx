"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { EndNodeData } from "../types";

export default function EndNode({ data, selected }: NodeProps<any>) {
  const d = data as EndNodeData;
  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-red-300 hover:border-red-500"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-red-700!" />
      <div className="rounded-t-[10px] bg-red-500 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none text-white">⏹</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white">End</span>
      </div>
      <div className="px-3 py-2">
        {d?.farewellText ? (
          <p className="line-clamp-2 text-xs text-gray-600 italic">{d.farewellText}</p>
        ) : (
          <p className="text-[11px] text-gray-300 italic">No farewell message</p>
        )}
      </div>
    </div>
  );
}
