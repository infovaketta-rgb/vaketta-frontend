"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { BranchNodeData } from "../types";

export default function BranchNode({ data, selected }: NodeProps<any>) {
  const d = data as BranchNodeData;
  const conditions = d?.conditions ?? [];

  return (
    <div
      className={`w-56 rounded-xl border bg-yellow-50 shadow-sm transition ${
        selected ? "border-yellow-400 shadow-md" : "border-yellow-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400" />
      <div className="border-b border-yellow-100 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">
          🔀 Branch
        </span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {conditions.length === 0 ? (
          <p className="text-[11px] italic text-yellow-400">No conditions yet</p>
        ) : (
          conditions.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1 text-[11px] text-yellow-800">
              <span className="shrink-0 font-mono text-yellow-500">{i + 1}.</span>
              <span className="truncate">{c.label || `${c.variable} ${c.operator} ${c.compareValue}`}</span>
              {/* each condition gets its own source handle rendered below */}
            </div>
          ))
        )}
        <div className="mt-1 text-[10px] text-yellow-500 font-medium">+ default</div>
      </div>

      {/* One source handle per condition + default */}
      {conditions.map((c, i) => (
        <Handle
          key={c.id}
          type="source"
          position={Position.Bottom}
          id={c.id}
          style={{ left: `${((i + 1) / (conditions.length + 1)) * 100}%` }}
          className="!bg-yellow-400"
        />
      ))}
      <Handle
        type="source"
        position={Position.Bottom}
        id={d?.defaultHandleId ?? "default"}
        style={{ left: `${(conditions.length + 1) / (conditions.length + 1) * 95}%` }}
        className="!bg-gray-400"
      />
    </div>
  );
}
