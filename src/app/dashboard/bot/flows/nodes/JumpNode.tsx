"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { JumpNodeData } from "../types";

export default function JumpNode({ data, selected }: NodeProps<any>) {
  const d = data as JumpNodeData;
  return (
    <div
      className={`w-48 rounded-xl border bg-white shadow-sm transition ${
        selected ? "border-violet-400 shadow-md" : "border-violet-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-violet-400" />
      <div className="border-b border-violet-100 bg-violet-50 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
          ↩ Jump
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs text-gray-600">
          {d?.label || (d?.targetNodeId
            ? <span className="font-mono text-[10px] text-violet-500">{d.targetNodeId.slice(0, 12)}…</span>
            : <span className="italic text-gray-300">No target set</span>
          )}
        </p>
      </div>
      {/* No source handle — execution jumps internally */}
    </div>
  );
}
