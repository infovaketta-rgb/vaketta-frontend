"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { StartNodeData } from "../types";

export default function StartNode({ data }: NodeProps<any>) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 shadow-md">
      <span className="text-sm font-bold text-white">▶ Start</span>
      {data?.label && <span className="text-xs text-green-100">{data.label}</span>}
      <Handle type="source" position={Position.Bottom} className="!bg-green-700" />
    </div>
  );
}
