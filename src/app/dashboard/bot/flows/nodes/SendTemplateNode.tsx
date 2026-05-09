"use client";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { SendTemplateNodeData } from "../types";

export default function SendTemplateNode({ data, selected }: NodeProps<any>) {
  const d = data as SendTemplateNodeData;
  const varCount = Object.keys(d?.variableMapping ?? {}).length;

  return (
    <div className={`w-56 rounded-xl border-2 bg-white shadow-md transition ${
      selected
        ? "border-[#7A3F91] shadow-xl ring-2 ring-purple-200"
        : "border-teal-200 hover:border-teal-400"
    }`}>
      <Handle type="target" position={Position.Top} className="bg-teal-500!" />
      <div className="rounded-t-[10px] bg-teal-50 border-b border-teal-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">📨</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Send Template</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {d?.templateName ? (
          <p className="text-[11px] font-mono font-semibold text-teal-800 truncate">{d.templateName}</p>
        ) : (
          <p className="text-[11px] italic text-teal-300">No template selected</p>
        )}
        {varCount > 0 && (
          <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
            {varCount} variable{varCount !== 1 ? "s" : ""} mapped
          </span>
        )}
      </div>
      <div className="flex justify-between px-3 pb-2 text-[9px] font-bold">
        <span className="text-green-600">✓ Success</span>
        <span className="text-red-500">✗ Failure</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        style={{ left: "25%" }}
        className="bg-green-500!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="failure"
        style={{ left: "75%" }}
        className="bg-red-400!"
      />
    </div>
  );
}
