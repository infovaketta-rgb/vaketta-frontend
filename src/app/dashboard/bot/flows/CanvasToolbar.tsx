"use client";

import Link from "next/link";

interface Props {
  name:          string;
  saving:        boolean;
  readOnly:      boolean;
  isTemplate:    boolean;
  backHref:      string;
  nodeCount?:    number;
  edgeCount?:    number;
  showingTest?:  boolean;
  onSave:        () => void;
  onNameChange:  (v: string) => void;
  onFitView?:    () => void;
  onTest?:       () => void;
}

export default function CanvasToolbar({
  name, saving, readOnly, isTemplate, backHref,
  nodeCount, edgeCount, showingTest,
  onSave, onNameChange, onFitView, onTest,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
      <Link
        href={backHref}
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
        title="Back"
      >
        ←
      </Link>

      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={readOnly}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-[#7A3F91] focus:outline-none disabled:cursor-default disabled:bg-transparent"
        placeholder="Flow name…"
      />

      {isTemplate && (
        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 shrink-0">
          Global Template
        </span>
      )}

      {/* Node / edge count */}
      {nodeCount !== undefined && (
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500 tabular-nums">
          {nodeCount} nodes · {edgeCount ?? 0} edges
        </span>
      )}

      {/* Fit view */}
      {onFitView && (
        <button
          onClick={onFitView}
          title="Fit view"
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
        >
          ⊡
        </button>
      )}

      {/* Test / simulator toggle */}
      {onTest && (
        <button
          onClick={onTest}
          title={showingTest ? "Close simulator" : "Open flow simulator"}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            showingTest
              ? "bg-[#7A3F91] text-white"
              : "border border-gray-200 text-gray-600 hover:border-[#7A3F91] hover:text-[#7A3F91]"
          }`}
        >
          🧪 Test
        </button>
      )}

      {readOnly ? (
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 shrink-0">
          Read-only
        </span>
      ) : (
        <button
          onClick={onSave}
          disabled={saving}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#7A3F91] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2B0D3E] disabled:opacity-50"
        >
          {saving && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
