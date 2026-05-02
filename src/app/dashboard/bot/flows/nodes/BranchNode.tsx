"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { BranchNodeData } from "../types";

export default function BranchNode({ data, selected }: NodeProps<any>) {
  const d = data as BranchNodeData;
  const conditions = d?.conditions ?? [];

  return (
    <div className={`w-56 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-yellow-300 hover:border-yellow-500"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-yellow-400!" />
      <div className="rounded-t-[10px] bg-yellow-50 border-b border-yellow-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">🔀</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">Branch</span>
        {conditions.length > 0 && (
          <span className="ml-auto rounded-full bg-yellow-100 px-1.5 text-[9px] font-bold text-yellow-700">
            {conditions.length}
          </span>
        )}
      </div>
      <div className="px-3 py-2 space-y-1">
        {conditions.length === 0 ? (
          <p className="text-[11px] italic text-yellow-400">No conditions yet</p>
        ) : (
          conditions.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1 text-[11px] text-yellow-800">
              <span className="shrink-0 font-mono text-yellow-400 text-[10px]">{i + 1}.</span>
              <span className="truncate">{c.label || `${c.variable} ${c.operator} ${c.compareValue}`}</span>
            </div>
          ))
        )}
        <div className="text-[10px] text-gray-400 font-medium pt-0.5">+ default</div>
      </div>

      {conditions.map((c, i) => (
        <Handle
          key={c.id}
          type="source"
          position={Position.Bottom}
          id={c.id}
          style={{ left: `${((i + 1) / (conditions.length + 1)) * 100}%` }}
          className="bg-yellow-400!"
        />
      ))}
      <Handle
        type="source"
        position={Position.Bottom}
        id={d?.defaultHandleId ?? "default"}
        style={{ left: `${(conditions.length + 1) / (conditions.length + 1) * 95}%` }}
        className="bg-gray-400!"
      />
    </div>
  );
}
