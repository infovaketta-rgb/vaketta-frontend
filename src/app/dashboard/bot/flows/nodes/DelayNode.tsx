"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { DelayNodeData } from "../types";

const UNIT_LABEL: Record<string, string> = {
  minutes: "min",
  hours:   "hr",
  days:    "day",
};

export default function DelayNode({ data, selected }: NodeProps<any>) {
  const d        = data as DelayNodeData;
  const duration = d?.duration ?? 1;
  const unit     = d?.unit ?? "hours";
  const plural   = duration !== 1 ? "s" : "";

  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-sky-200 hover:border-sky-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-sky-400!" />
      <div className="rounded-t-[10px] bg-sky-50 border-b border-sky-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">⏱</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500">Delay</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-100 text-sky-800">
          Wait {duration} {UNIT_LABEL[unit] ?? unit}{plural}
        </span>
        {d?.resumeMessage && (
          <p className="line-clamp-1 text-[10px] text-sky-600 italic">{d.resumeMessage}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-sky-400!" />
    </div>
  );
}
