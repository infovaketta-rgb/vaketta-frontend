"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { QuestionNodeData } from "../types";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  text:           { label: "Text",      cls: "bg-blue-100 text-blue-700"   },
  room_selection: { label: "Room pick", cls: "bg-indigo-100 text-indigo-700" },
  date:           { label: "Date",      cls: "bg-cyan-100 text-cyan-700"   },
  number:         { label: "Number",    cls: "bg-sky-100 text-sky-700"     },
  yes_no:         { label: "Yes/No",    cls: "bg-violet-100 text-violet-700" },
  rating:         { label: "Rating ★",  cls: "bg-amber-100 text-amber-700" },
};

export default function QuestionNode({ data, selected }: NodeProps<any>) {
  const d = data as QuestionNodeData;
  const badge = TYPE_BADGES[d?.questionType ?? "text"] ?? TYPE_BADGES["text"]!;

  return (
    <div className={`w-52 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-blue-200 hover:border-blue-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-blue-400!" />
      <div className="rounded-t-[10px] bg-blue-50 border-b border-blue-100 px-3 py-1.5 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">❓</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Question</span>
        </div>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="line-clamp-2 text-xs text-blue-900">
          {d?.text || <span className="italic text-blue-300">No question set</span>}
        </p>
        {d?.variableName && (
          <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700">
            → {d.variableName}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-blue-400!" />
    </div>
  );
}
