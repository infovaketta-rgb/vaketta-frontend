"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ShowRoomsNodeData } from "../types";

export default function ShowRoomsNode({ data, selected }: NodeProps<any>) {
  const d = data as ShowRoomsNodeData;
  const filterLabel = d?.filter === "available_only" ? "Available only" : "All rooms";

  return (
    <div
      className={`w-56 rounded-xl border shadow-sm transition ${
        selected ? "border-blue-500 shadow-md" : "border-blue-200"
      } bg-blue-50`}
    >
      <Handle type="target" position={Position.Top} className="bg-blue-500!" />

      <div className="border-b border-blue-100 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
          🏨 Show Rooms
        </span>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <p className="line-clamp-2 text-xs text-blue-900">
          {d?.text || <span className="italic text-blue-300">No prompt set</span>}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              d?.filter === "available_only"
                ? "bg-green-100 text-green-700"
                : "bg-blue-200 text-blue-700"
            }`}
          >
            {filterLabel}
          </span>
          {d?.variableName && (
            <span className="font-mono rounded bg-blue-200 px-1 py-0.5 text-[10px] text-blue-700">
              → {d.variableName}
            </span>
          )}
        </div>
        {d?.filter === "available_only" && d?.checkInVar && (
          <p className="text-[10px] text-blue-500">
            Dates: <span className="font-mono">{d.checkInVar}</span> → <span className="font-mono">{d.checkOutVar}</span>
          </p>
        )}
        {(d?.minAdults || d?.minChildren || d?.minCapacity) ? (
          <p className="text-[10px] text-blue-400">
            {[
              d?.minAdults   ? `≥${d.minAdults}A`          : null,
              d?.minChildren ? `≥${d.minChildren}C`         : null,
              d?.minCapacity && !d?.minAdults ? `cap≥${d.minCapacity}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-blue-500!" />
    </div>
  );
}
