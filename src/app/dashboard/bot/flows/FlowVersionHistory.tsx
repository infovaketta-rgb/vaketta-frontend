"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface FlowVersion {
  id:            string;
  versionNumber: number;
  status:        "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt:   string | null;
  createdAt:     string;
  createdBy:     string | null;
}

interface Props {
  flowId:     string;
  onRollback: () => void;
  onClose:    () => void;
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT:     "bg-blue-100  text-blue-700",
  ARCHIVED:  "bg-gray-100  text-gray-500",
};

export default function FlowVersionHistory({ flowId, onRollback, onClose }: Props) {
  const [versions,    setVersions]    = useState<FlowVersion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [error,       setError]       = useState("");

  useEffect(() => {
    apiFetch(`/hotel-settings/flows/${flowId}/versions`)
      .then((data: FlowVersion[]) => setVersions(data))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [flowId]);

  async function handleRollback(versionId: string) {
    setRollingBack(versionId);
    setError("");
    try {
      await apiFetch(`/hotel-settings/flows/${flowId}/rollback/${versionId}`, { method: "POST" });
      onRollback();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRollingBack(null);
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <p className="text-xs font-bold text-gray-700">🕑 Version History</p>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600 text-sm leading-none"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-0 max-h-[600px]">
        {error && (
          <p className="text-[11px] text-red-500 px-1">{error}</p>
        )}
        {loading ? (
          <p className="text-center text-[11px] text-gray-400 py-6">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-center text-[11px] text-gray-400 py-6">
            No versions saved yet. Click <strong>Save Draft</strong> to create one.
          </p>
        ) : (
          versions.map((v) => (
            <div
              key={v.id}
              className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-700">v{v.versionNumber}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[v.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {v.status}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  {v.status === "PUBLISHED" && v.publishedAt
                    ? `Published ${new Date(v.publishedAt).toLocaleDateString()}`
                    : `Saved ${new Date(v.createdAt).toLocaleDateString()}`}
                  {v.createdBy ? ` · ${v.createdBy}` : ""}
                </p>
              </div>

              {v.status === "ARCHIVED" && (
                <button
                  onClick={() => handleRollback(v.id)}
                  disabled={rollingBack === v.id}
                  className="shrink-0 rounded px-2 py-1 text-[10px] font-semibold bg-[#7A3F91] text-white hover:bg-[#2B0D3E] transition disabled:opacity-50"
                >
                  {rollingBack === v.id ? "…" : "Restore"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
