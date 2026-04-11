"use client";

import Link from "next/link";

interface Props {
  name:       string;
  saving:     boolean;
  readOnly:   boolean;
  isTemplate: boolean;
  backHref:   string;
  onSave:     () => void;
  onNameChange: (v: string) => void;
}

export default function CanvasToolbar({
  name, saving, readOnly, isTemplate, backHref, onSave, onNameChange,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
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
        className="flex-1 rounded-lg border border-transparent bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-[#7A3F91] focus:outline-none disabled:cursor-default disabled:bg-transparent"
        placeholder="Flow name…"
      />

      {isTemplate && (
        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
          Global Template
        </span>
      )}

      {readOnly ? (
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">
          Read-only
        </span>
      ) : (
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#7A3F91] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2B0D3E] disabled:opacity-50"
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
