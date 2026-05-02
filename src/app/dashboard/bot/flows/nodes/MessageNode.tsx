"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { MessageNodeData } from "../types";

export default function MessageNode({ data, selected }: NodeProps<any>) {
  const d = data as MessageNodeData;
  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-gray-200 hover:border-gray-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-gray-400!" />
      <div className="rounded-t-[10px] bg-gray-100 border-b border-gray-200 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">💬</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Message</span>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-3 text-xs text-gray-700">
          {d?.text || <span className="italic text-gray-300">No text set</span>}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-gray-400!" />
    </div>
  );
}
