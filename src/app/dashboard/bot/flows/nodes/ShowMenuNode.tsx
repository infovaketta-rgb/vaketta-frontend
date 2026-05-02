"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export default function ShowMenuNode({ selected }: NodeProps<any>) {
  return (
    <div className={`w-48 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-purple-200 hover:border-purple-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-purple-400!" />
      <div className="rounded-t-[10px] bg-purple-50 border-b border-purple-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">📋</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Show Menu</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[10px] italic text-gray-400">Sends the hotel's menu</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-purple-400!" />
    </div>
  );
}
