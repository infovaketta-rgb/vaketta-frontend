"use client";

import { useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";

type TrialConfig = {
  id:                string;
  durationDays:      number;
  conversationLimit: number;
  aiReplyLimit:      number;
  autoStartOnCreate: boolean;
  trialMessage:      string;
  updatedAt:         string;
};

function limitLabel(n: number) {
  return n === 0 ? "Unlimited" : n.toLocaleString();
}

const inputCls =
  "w-full rounded-lg border border-[#E5E0D4] bg-white px-3 py-2.5 text-sm text-[#0C1B33] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20 focus:border-[#1B52A8] transition";

export default function TrialConfigPage() {
  const mounted = useMounted();

  const [config,  setConfig]  = useState<TrialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  const [durationDays,      setDurationDays]      = useState("14");
  const [conversationLimit, setConversationLimit] = useState("500");
  const [aiReplyLimit,      setAiReplyLimit]      = useState("200");
  const [autoStart,         setAutoStart]         = useState(true);
  const [trialMessage,      setTrialMessage]      = useState("");

  useEffect(() => {
    if (!mounted) return;
    adminApiFetch("/admin/trial-config")
      .then((data: TrialConfig) => {
        setConfig(data);
        setDurationDays(String(data.durationDays));
        setConversationLimit(String(data.conversationLimit));
        setAiReplyLimit(String(data.aiReplyLimit));
        setAutoStart(data.autoStartOnCreate);
        setTrialMessage(data.trialMessage);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const updated: TrialConfig = await adminApiFetch("/admin/trial-config", {
        method: "PATCH",
        body: JSON.stringify({
          durationDays:      Number(durationDays),
          conversationLimit: Number(conversationLimit),
          aiReplyLimit:      Number(aiReplyLimit),
          autoStartOnCreate: autoStart,
          trialMessage:      trialMessage.trim(),
        }),
      });
      setConfig(updated);
      setSuccess("Trial settings saved successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Trial Plan</h1>
        <p className="mt-1 text-sm text-[#0C1B33]/50">
          Configure the default free trial given to new or unsubscribed hotels.
        </p>
      </div>

      {/* Live preview card */}
      {config && (
        <div className="rounded-2xl border border-[#1B52A8]/15 bg-[#1B52A8]/5 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1B52A8]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#1B52A8]">Current Trial Defaults</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Duration",      value: `${config.durationDays} days` },
              { label: "Conversations", value: limitLabel(config.conversationLimit) },
              { label: "AI Replies",    value: limitLabel(config.aiReplyLimit) },
              { label: "Auto-start",    value: config.autoStartOnCreate ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[#1B52A8]/60 font-medium">{label}</p>
                <p className="mt-0.5 font-bold text-[#0C1B33]">{value}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-[#1B52A8]/10 pt-2 text-xs text-[#0C1B33]/40 italic">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1B52A8] border-t-transparent" />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">

        {/* Duration & Limits */}
        <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">Duration & Limits</h2>
            <p className="mt-0.5 text-xs text-[#0C1B33]/45">Set 0 for a limit to make it unlimited during trial.</p>
          </div>
          <div className="px-6 py-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Trial Duration (days)</label>
              <input type="number" min={1} max={365} value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)} className={inputCls} placeholder="14" />
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">Max 365 days</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">Conversation Limit</label>
              <input type="number" min={0} value={conversationLimit}
                onChange={(e) => setConversationLimit(e.target.value)} className={inputCls} placeholder="500" />
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">0 = unlimited</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#0C1B33]/60">AI Reply Limit</label>
              <input type="number" min={0} value={aiReplyLimit}
                onChange={(e) => setAiReplyLimit(e.target.value)} className={inputCls} placeholder="200" />
              <p className="mt-1 text-[11px] text-[#0C1B33]/40">0 = unlimited</p>
            </div>
          </div>
        </div>

        {/* Behaviour */}
        <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">Behaviour</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-[#0C1B33]">Auto-start trial for new hotels</p>
                <p className="mt-0.5 text-xs text-[#0C1B33]/50">
                  When enabled, every newly created hotel automatically receives a trial period.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoStart((v) => !v)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  autoStart ? "bg-[#1B52A8]" : "bg-slate-300"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  autoStart ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Trial message */}
        <div className="rounded-2xl border border-[#E5E0D4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0C1B33]">Trial Message</h2>
            <p className="mt-0.5 text-xs text-[#0C1B33]/45">Shown to hotel staff on their Subscription page during trial.</p>
          </div>
          <div className="px-6 py-5">
            <textarea
              rows={3}
              value={trialMessage}
              onChange={(e) => setTrialMessage(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="e.g. You are on a free trial. Upgrade to continue after it ends."
            />
          </div>
        </div>

        {error   && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-[#1B52A8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] disabled:opacity-50"
          >
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
