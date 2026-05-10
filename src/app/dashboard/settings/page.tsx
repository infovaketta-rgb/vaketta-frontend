"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { useToastStore } from "@/store/toastStore";

// ── types ──────────────────────────────────────────────────────────────────

type Settings = {
  id: string;
  name: string;
  phone: string;
  apiKey: string | null;
};

// ── sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-50 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const mounted = useMounted();
  const router  = useRouter();
  const { addToast } = useToastStore();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]               = useState(false);

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/hotel-settings")
      .then((data: Settings) => setSettings(data))
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, [mounted]);

  async function handleDeleteAllChats() {
    setDeleting(true);
    try {
      await apiFetch("/hotel-settings/chats", { method: "DELETE" });
      addToast("All chats deleted successfully", "success");
      setShowDeleteModal(false);
    } catch (err: any) {
      addToast(err.message || "Failed to delete chats", "error");
    } finally {
      setDeleting(false);
    }
  }

  function copyApiKey() {
    if (!settings?.apiKey) return;
    navigator.clipboard.writeText(settings.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!mounted || loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-gray-400">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading settings…
      </div>
    );
  }

  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="p-4 md:p-8 w-full max-w-2xl space-y-6">

      {/* Hotel Profile */}
      <SectionCard title="Hotel Profile" description="Read-only details about your property.">
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Hotel Name</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800">{settings?.name}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">WhatsApp Number</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800">+{settings?.phone}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">API Key</p>
              <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                {settings?.apiKey ? `${settings.apiKey.slice(0, 16)}••••••••••••••••` : "—"}
              </p>
            </div>
            <button
              onClick={copyApiKey}
              className="ml-4 shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Quick links */}
      <SectionCard title="Configuration" description="Manage your hotel profile and bot settings from here.">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push("/dashboard/configuration")}
            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">Hotel Configuration</p>
              <p className="text-xs text-gray-400">Edit name, location, check-in/out times, contact details</p>
            </div>
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/dashboard/bot")}
            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">WhatsApp Bot</p>
              <p className="text-xs text-gray-400">Manage menu items, bot messages, auto-reply hours and flow</p>
            </div>
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 px-6 py-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete All Chats</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Permanently delete all conversations and messages for this hotel. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
            >
              Delete All Chats
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-semibold text-gray-900">Are you sure?</h3>
              <p className="mt-2 text-sm text-gray-500">
                This will permanently delete all conversations and messages. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllChats}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                Delete All Chats
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
