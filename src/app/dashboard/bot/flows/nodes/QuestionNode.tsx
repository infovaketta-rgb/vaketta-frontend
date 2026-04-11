"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { QuestionNodeData } from "../types";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  text:           { label: "Text",        cls: "bg-blue-200 text-blue-800" },
  room_selection: { label: "Room pick",   cls: "bg-indigo-200 text-indigo-800" },
  date:           { label: "Date",        cls: "bg-cyan-200 text-cyan-800" },
  number:         { label: "Number",      cls: "bg-sky-200 text-sky-800" },
  yes_no:         { label: "Yes / No",    cls: "bg-violet-200 text-violet-800" },
  rating:         { label: "Rating ★",    cls: "bg-amber-200 text-amber-800" },
};

export default function QuestionNode({ data, selected }: NodeProps<any>) {
  const d = data as QuestionNodeData;
  const badge = TYPE_BADGES[d?.questionType ?? "text"] ?? TYPE_BADGES["text"]!;

  return (
    <div
      className={`w-52 rounded-xl border bg-blue-50 shadow-sm transition ${
        selected ? "border-blue-400 shadow-md" : "border-blue-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="bg-blue-400!" />
      <div className="border-b border-blue-100 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
          ❓ Question
        </span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="line-clamp-2 text-xs text-blue-900">
          {d?.text || <span className="italic text-blue-300">No question set</span>}
        </p>
        {d?.variableName && (
          <span className="inline-block rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700">
            → {d.variableName}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-blue-400!" />
    </div>
  );
}
