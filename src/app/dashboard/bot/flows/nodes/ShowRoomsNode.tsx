"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ShowRoomsNodeData } from "../types";

export default function ShowRoomsNode({ data, selected }: NodeProps<any>) {
  const d = data as ShowRoomsNodeData;
  const filterLabel = d?.filter === "available_only" ? "Available only" : "All rooms";

  return (
    <div className={`w-56 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-blue-200 hover:border-blue-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-blue-500!" />
      <div className="rounded-t-[10px] bg-blue-50 border-b border-blue-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">🏨</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Show Rooms</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="line-clamp-2 text-xs text-blue-900">
          {d?.text || <span className="italic text-blue-300">No prompt set</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            d?.filter === "available_only" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
          }`}>
            {filterLabel}
          </span>
          {d?.variableName && (
            <span className="font-mono rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-700">
              → {d.variableName}
            </span>
          )}
        </div>
        {(d?.minAdults || d?.minChildren || d?.minCapacity) && (
          <p className="text-[10px] text-blue-400">
            {[
              d?.minAdults   ? `≥${d.minAdults}A`                            : null,
              d?.minChildren ? `≥${d.minChildren}C`                          : null,
              d?.minCapacity && !d?.minAdults ? `cap≥${d.minCapacity}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-blue-500!" />
    </div>
  );
}
