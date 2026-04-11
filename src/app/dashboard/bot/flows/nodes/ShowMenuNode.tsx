"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export default function ShowMenuNode({ selected }: NodeProps<any>) {
  return (
    <div
      className={`w-48 rounded-xl border bg-white shadow-sm transition ${
        selected ? "border-purple-400 shadow-md" : "border-purple-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-400" />
      <div className="border-b border-purple-100 bg-purple-50 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
          📋 Show Menu
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[10px] italic text-gray-400">Sends the hotel's menu</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400" />
    </div>
  );
}
