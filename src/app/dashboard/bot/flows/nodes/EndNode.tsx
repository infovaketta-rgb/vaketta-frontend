"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { EndNodeData } from "../types";

export default function EndNode({ data, selected }: NodeProps<any>) {
  const d = data as EndNodeData;
  return (
    <div
      className={`flex flex-col items-center rounded-full border px-4 py-2 shadow-md transition ${
        selected ? "border-red-400 shadow-lg" : "border-red-300"
      } bg-red-500`}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-700" />
      <span className="text-sm font-bold text-white">⏹ End</span>
      {d?.farewellText && (
        <span className="mt-0.5 max-w-[140px] truncate text-[10px] text-red-100">
          {d.farewellText}
        </span>
      )}
    </div>
  );
}
