"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { OptionsNodeData } from "../types";

export default function OptionsNode({ data, selected }: NodeProps<any>) {
  const d = data as OptionsNodeData;
  const opts = d?.options ?? [];

  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-green-200 hover:border-green-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-green-400!" />
      <div className="rounded-t-[10px] bg-green-50 border-b border-green-100 px-3 py-1.5 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">☰</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Options</span>
        </div>
        {d?.useListMessage && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
            List msg
          </span>
        )}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="line-clamp-2 text-xs text-green-900">
          {d?.text || <span className="italic text-green-300">No prompt set</span>}
        </p>
        {opts.length > 0 && (
          <div className="space-y-0.5">
            {opts.slice(0, 3).map((opt, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[9px] text-green-500 font-bold">{i + 1}.</span>
                <span className="text-[10px] text-green-800 truncate">{opt.label || "…"}</span>
              </div>
            ))}
            {opts.length > 3 && (
              <p className="text-[9px] text-green-400 italic">+{opts.length - 3} more</p>
            )}
          </div>
        )}
        {d?.variableName && (
          <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-green-700">
            → {d.variableName}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-green-400!" />
    </div>
  );
}
