"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { SendSavedReplyNodeData } from "../types";

export default function SendSavedReplyNode({ data, selected }: NodeProps<any>) {
  const d = data as SendSavedReplyNodeData;
  const overrideCount = Object.keys(d?.variableOverrides ?? {}).length;

  return (
    <div className={`w-56 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-green-200 hover:border-green-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-green-500!" />
      <div className="rounded-t-[10px] bg-green-50 border-b border-green-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">🔖</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">Saved Reply</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {d?.savedReplyName ? (
          <p className="text-[11px] font-semibold text-green-800 truncate">{d.savedReplyName}</p>
        ) : (
          <p className="text-[11px] italic text-green-300">No reply selected</p>
        )}
        {overrideCount > 0 && (
          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            {overrideCount} override{overrideCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-green-500!" />
    </div>
  );
}
