"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { MessageNodeData } from "../types";

export default function MessageNode({ data, selected }: NodeProps<any>) {
  const d = data as MessageNodeData;
  return (
    <div
      className={`w-52 rounded-xl border bg-white shadow-sm transition ${
        selected ? "border-gray-400 shadow-md" : "border-gray-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="border-b border-gray-100 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          💬 Message
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-3 text-xs text-gray-700">
          {d?.text || <span className="italic text-gray-300">No text set</span>}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
