"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function ToolBtn({ title, onClick, active, children }: {
  title: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded text-sm transition ${active ? "bg-[#1B52A8] text-white" : "text-[#0C1B33] hover:bg-[#E5E0D4]"}`}
    >
      {children}
    </button>
  );
}

function exec(cmd: string, value?: string) { document.execCommand(cmd, false, value); }
function isActive(cmd: string) { try { return document.queryCommandState(cmd); } catch { return false; } }

export default function DataDeletionAdminPage() {
  const mounted   = useMounted();
  const editorRef = useRef<HTMLDivElement>(null);

  const [effectiveDate, setEffectiveDate] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState("");
  const [error,    setError]    = useState("");
  const [, forceUpdate] = useState(0);
  const fetchedContent = useRef<string>("");

  useEffect(() => {
    if (!mounted) return;
    fetch(`${API_BASE}/admin/data-deletion`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((data) => {
        setEffectiveDate(data.effectiveDate ?? "");
        fetchedContent.current = data.content ?? "";
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mounted]);

  useEffect(() => {
    if (loading) return;
    if (editorRef.current) editorRef.current.innerHTML = fetchedContent.current;
  }, [loading]);

  const onSelectionChange = useCallback(() => forceUpdate((n) => n + 1), []);
  useEffect(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [onSelectionChange]);

  async function handleSave() {
    if (!editorRef.current) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await adminApiFetch("/admin/data-deletion", {
        method: "PATCH",
        body: JSON.stringify({ effectiveDate, content: editorRef.current.innerHTML }),
      });
      setSuccess("Data Deletion page saved successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E0D4] border-t-[#1B52A8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C1B33]">Data Deletion Instructions</h1>
          <p className="mt-1 text-sm text-slate-500">Edit the public-facing data deletion page. Changes take effect immediately.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/data-deletion" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E0D4] bg-white px-4 py-2 text-sm text-[#0C1B33] transition hover:bg-[#F4F2ED]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Preview
          </a>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1B52A8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#163f82] disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>}
      {error   && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-[#E5E0D4] bg-white p-5">
        <label className="mb-2 block text-sm font-semibold text-[#0C1B33]">Effective Date</label>
        <input type="text" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
          placeholder="e.g. April 17, 2026"
          className="w-full max-w-xs rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E0D4] bg-white">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#E5E0D4] bg-[#F4F2ED] px-3 py-2">
          <ToolBtn title="Bold"      active={isActive("bold")}      onClick={() => exec("bold")}><strong>B</strong></ToolBtn>
          <ToolBtn title="Italic"    active={isActive("italic")}    onClick={() => exec("italic")}><em>I</em></ToolBtn>
          <ToolBtn title="Underline" active={isActive("underline")} onClick={() => exec("underline")}><span className="underline">U</span></ToolBtn>
          <div className="mx-1.5 h-5 w-px bg-[#E5E0D4]" />
          <ToolBtn title="Heading 1" onClick={() => exec("formatBlock", "h1")}><span className="text-xs font-bold">H1</span></ToolBtn>
          <ToolBtn title="Heading 2" onClick={() => exec("formatBlock", "h2")}><span className="text-xs font-bold">H2</span></ToolBtn>
          <ToolBtn title="Heading 3" onClick={() => exec("formatBlock", "h3")}><span className="text-xs font-bold">H3</span></ToolBtn>
          <ToolBtn title="Paragraph" onClick={() => exec("formatBlock", "p")}><span className="text-xs">P</span></ToolBtn>
          <div className="mx-1.5 h-5 w-px bg-[#E5E0D4]" />
          <ToolBtn title="Bullet list"   active={isActive("insertUnorderedList")} onClick={() => exec("insertUnorderedList")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </ToolBtn>
          <ToolBtn title="Numbered list" active={isActive("insertOrderedList")} onClick={() => exec("insertOrderedList")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01" /></svg>
          </ToolBtn>
          <div className="mx-1.5 h-5 w-px bg-[#E5E0D4]" />
          <ToolBtn title="Undo" onClick={() => exec("undo")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 0 1 0 10H9M3 10l4-4M3 10l4 4" /></svg>
          </ToolBtn>
          <ToolBtn title="Redo" onClick={() => exec("redo")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 0 0 0 10h4M21 10l-4-4m4 4l-4 4" /></svg>
          </ToolBtn>
          <div className="mx-1.5 h-5 w-px bg-[#E5E0D4]" />
          <ToolBtn title="Clear formatting" onClick={() => exec("removeFormat")}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </ToolBtn>
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning spellCheck
          className="min-h-[600px] px-10 py-8 text-[#0C1B33] focus:outline-none prose-editor"
          style={{ lineHeight: "1.75" }} />
      </div>

      <div className="flex justify-end pb-4">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#1B52A8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f82] disabled:opacity-60">
          {saving ? "Saving…" : "Save Page"}
        </button>
      </div>

      <style>{`
        .prose-editor h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #0C1B33; border-bottom: 2px solid #E5E0D4; padding-bottom: 0.4rem; }
        .prose-editor h2 { font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #0C1B33; }
        .prose-editor h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.25rem; color: #1B52A8; }
        .prose-editor p  { margin: 0.5rem 0; }
        .prose-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose-editor li { margin: 0.2rem 0; }
        .prose-editor strong { font-weight: 700; }
        .prose-editor em { font-style: italic; }
        .prose-editor a { color: #1B52A8; text-decoration: underline; }
      `}</style>
    </div>
  );
}
