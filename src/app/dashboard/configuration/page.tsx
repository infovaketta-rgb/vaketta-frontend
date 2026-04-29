"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import { saveHotelName } from "@/lib/auth";

// ── types ──────────────────────────────────────────────────────────────────────

type Profile = {
  name: string;
  phone: string;
  location: string;
  email: string;
  description: string;
  checkInTime: string;
  checkOutTime: string;
  website: string;
  apiKey: string | null;
};

type WhatsAppConfig = {
  metaPhoneNumberId: string;
  metaAccessToken:   string;
  metaWabaId:        string;
  metaVerifyToken:   string;
  connected:         boolean;
};

type InstagramConfig = {
  accessToken:   string;
  igAccountId:   string;
  connected:     boolean;
  embedUrl:      string;
};

// ── helpers ────────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A3F91] transition";

const readonlyClass =
  "w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed";

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-linear-to-r from-[#F2EAF7] to-white px-6 py-4">
        <h2 className="text-sm font-semibold text-[#2B0D3E]">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────────

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE ?? "") + "/webhook/whatsapp";

const INSTAGRAM_WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE ?? "") + "/webhook/instagram";

export default function ConfigurationPage() {
  const mounted = useMounted();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  // WhatsApp integration state
  const [wa, setWa]             = useState<WhatsAppConfig>({
    metaPhoneNumberId: "",
    metaAccessToken:   "",
    metaWabaId:        "",
    metaVerifyToken:   "",
    connected:         false,
  });
  const [waSaving, setWaSaving]     = useState(false);
  const [waSaved,  setWaSaved]      = useState(false);
  const [waError,  setWaError]      = useState("");
  const [showToken, setShowToken]   = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedVerify,  setCopiedVerify]  = useState(false);
  const [stepsOpen,     setStepsOpen]     = useState(false);
  const [advancedOpen,  setAdvancedOpen]  = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [testResult,   setTestResult]   = useState<"success" | "error" | null>(null);
  const [fbConnecting, setFbConnecting] = useState(false);
  const [fbError,      setFbError]      = useState("");

  // Instagram integration state
  const [ig, setIg]               = useState<InstagramConfig>({ accessToken: "", igAccountId: "", connected: false, embedUrl: "" });
  const [igConnecting,  setIgConnecting]  = useState(false);
  const [igOAuthError,  setIgOAuthError]  = useState("");
  const [igSubStatus,   setIgSubStatus]   = useState<boolean | null>(null);
  const [igSubLoading,  setIgSubLoading]  = useState(false);
  const [igSubError,    setIgSubError]    = useState("");
  const [igSaving,  setIgSaving]  = useState(false);
  const [igSaved,   setIgSaved]   = useState(false);
  const [igError,   setIgError]   = useState("");
  const [showIgToken, setShowIgToken] = useState(false);
  const [igAdvancedOpen, setIgAdvancedOpen] = useState(false);

  // Message delay state
  const [delayEnabled, setDelayEnabled]   = useState(false);
  const [delaySeconds, setDelaySeconds]   = useState(10);
  const [delaySaving,  setDelaySaving]    = useState(false);
  const [delaySaved,   setDelaySaved]     = useState(false);

  const [form, setForm] = useState<Profile>({
    name:         "",
    phone:        "",
    location:     "",
    email:        "",
    description:  "",
    checkInTime:  "14:00",
    checkOutTime: "11:00",
    website:      "",
    apiKey:       null,
  });

  useEffect(() => {
    if (!mounted) return;
    apiFetch("/hotel-settings")
      .then((data: any) => {
        setForm({
          name:         data.name         ?? "",
          phone:        data.phone        ?? "",
          location:     data.location     ?? "",
          email:        data.email        ?? "",
          description:  data.description  ?? "",
          checkInTime:  data.checkInTime  ?? "14:00",
          checkOutTime: data.checkOutTime ?? "11:00",
          website:      data.website      ?? "",
          apiKey:       data.apiKey       ?? null,
        });
        // Load delay settings from config
        if (data.config) {
          setDelayEnabled(data.config.messageDelayEnabled ?? false);
          setDelaySeconds(data.config.messageDelaySeconds ?? 10);
        }
      })
      .catch(() => setError("Failed to load configuration."))
      .finally(() => setLoading(false));

    apiFetch("/hotel-settings/whatsapp")
      .then((data: any) => setWa({
        metaPhoneNumberId: data.metaPhoneNumberId ?? "",
        metaAccessToken:   data.metaAccessToken   ?? "",
        metaWabaId:        data.metaWabaId        ?? "",
        metaVerifyToken:   data.metaVerifyToken   ?? "",
        connected:         data.connected         ?? false,
      }))
      .catch(() => {});

    apiFetch("/hotel-settings/instagram")
      .then((data: any) => {
        const connected = data.connected ?? false;
        setIg({
          accessToken: data.accessToken ?? "",
          igAccountId: data.igAccountId ?? "",
          connected,
          embedUrl:    data.embedUrl    ?? "",
        });
        if (connected) {
          apiFetch("/hotel-settings/instagram/subscribe/status")
            .then((s: any) => setIgSubStatus(s.subscribed ?? false))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [mounted]);

  function set(field: keyof Profile, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    setError("");
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Hotel name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch("/hotel-settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name:         form.name.trim(),
          location:     form.location.trim()    || null,
          email:        form.email.trim()       || null,
          description:  form.description.trim() || null,
          checkInTime:  form.checkInTime,
          checkOutTime: form.checkOutTime,
          website:      form.website.trim()     || null,
        }),
      });
      // Keep phone in sync
      setForm((f) => ({ ...f, ...updated }));
      // Update hotel name in localStorage so TopBar reflects immediately
      saveHotelName(updated.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function copyApiKey() {
    if (!form.apiKey) return;
    await navigator.clipboard.writeText(form.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelaySave() {
    setDelaySaving(true);
    try {
      await apiFetch("/hotel-settings", {
        method: "PATCH",
        body: JSON.stringify({
          messageDelayEnabled: delayEnabled,
          messageDelaySeconds: Math.max(1, Math.min(60, delaySeconds)),
        }),
      });
      setDelaySaved(true);
      setTimeout(() => setDelaySaved(false), 3000);
    } catch (e: any) {
      console.error("Failed to save delay settings", e);
    } finally {
      setDelaySaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/hotel-settings/whatsapp/test", { method: "POST" });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  async function handleWaSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setWaSaving(true);
    setWaError("");
    try {
      const updated = await apiFetch("/hotel-settings/whatsapp", {
        method: "PATCH",
        body: JSON.stringify({
          metaPhoneNumberId: wa.metaPhoneNumberId.trim() || null,
          metaAccessToken:   wa.metaAccessToken.trim()   || null,
          metaWabaId:        wa.metaWabaId.trim()        || null,
          metaVerifyToken:   wa.metaVerifyToken.trim()   || null,
        }),
      });
      setWa({
        metaPhoneNumberId: updated.metaPhoneNumberId ?? "",
        metaAccessToken:   updated.metaAccessToken   ?? "",
        metaWabaId:        updated.metaWabaId        ?? "",
        metaVerifyToken:   updated.metaVerifyToken   ?? "",
        connected:         updated.connected         ?? false,
      });
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 3000);
    } catch (err: any) {
      setWaError(err.message || "Failed to save WhatsApp settings.");
    } finally {
      setWaSaving(false);
    }
  }

  // ── Facebook Embedded Signup ──────────────────────────────────────────────
  // Load the Facebook JS SDK once when the component mounts
  useEffect(() => {
    if (!mounted) return;

    // fbAsyncInit must be defined BEFORE the SDK script loads
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId:   process.env.NEXT_PUBLIC_META_APP_ID ?? "",
        cookie:  true,
        xfbml:   true,
        version: "v21.0",
      });
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id    = "facebook-jssdk";
      script.src   = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [mounted]);

  function handleFBConnect() {
    setFbError("");

    const FB     = (window as any).FB;
    const appId  = process.env.NEXT_PUBLIC_META_APP_ID;
    const cfgId  = process.env.NEXT_PUBLIC_META_CONFIG_ID; // Embedded Signup config ID

    // ── Fallback: open the OAuth popup manually if FB SDK hasn't initialised ──
    if (!FB) {
      if (!appId) {
        setFbError("Meta App ID is not configured. Contact your administrator.");
        return;
      }
      const w = 600, h = 700;
      const left = Math.round(window.screenX + (window.outerWidth  - w) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const params = new URLSearchParams({
        client_id:                    appId,
        response_type:                "code",
        override_default_response_type: "true",
        ...(cfgId ? { config_id: cfgId } : {}),
      });
      window.open(
        `https://www.facebook.com/dialog/oauth?${params}`,
        "fb-whatsapp-signup",
        `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      return;
    }

    // ── Primary path: use the Facebook JS SDK (opens popup automatically) ───
    setFbConnecting(true);

    FB.login(
      function (response: any) {
        const code = response?.authResponse?.code;

        if (!code) {
          // User cancelled or denied
          setFbConnecting(false);
          if (response?.status !== "unknown") {
            setFbError("Facebook authorisation was cancelled. Please try again.");
          }
          return;
        }

        // Send code to backend → exchange for permanent access token + WABA/phone IDs
        apiFetch("/hotel-settings/whatsapp/fb-exchange", {
          method: "POST",
          body:   JSON.stringify({ code }),
        })
          .then((data: any) => {
            setWa((w) => ({
              ...w,
              metaPhoneNumberId: data.phoneNumberId ?? w.metaPhoneNumberId,
              metaWabaId:        data.wabaId        ?? w.metaWabaId,
              metaAccessToken:   data.accessToken   ?? w.metaAccessToken,
              connected:         true,
            }));
            // Expand Advanced Setup so user can review & save the pre-filled credentials
            setAdvancedOpen(true);
          })
          .catch((e: any) => {
            setFbError(e.message ?? "Failed to exchange token. You can enter credentials manually below.");
          })
          .finally(() => setFbConnecting(false));
      },
      {
        // Required params for Meta Embedded Signup (WhatsApp Business Platform)
        config_id:                      cfgId ?? "",
        response_type:                  "code",
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureType:        "",
          sessionInfoVersion: "2",
        },
      }
    );
  }

  async function handleIgSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setIgSaving(true);
    setIgError("");
    try {
      const updated = await apiFetch("/hotel-settings/instagram", {
        method: "PATCH",
        body: JSON.stringify({
          accessToken: ig.accessToken.trim() || null,
          igAccountId: ig.igAccountId.trim() || null,
        }),
      });
      setIg((prev) => ({
        ...prev,
        accessToken: updated.accessToken ?? "",
        igAccountId: updated.igAccountId ?? "",
        connected:   updated.connected   ?? false,
      }));
      setIgSaved(true);
      setTimeout(() => setIgSaved(false), 3000);
    } catch (err: any) {
      setIgError(err.message || "Failed to save Instagram settings.");
    } finally {
      setIgSaving(false);
    }
  }

  function handleIgConnect() {
    const url = ig.embedUrl || process.env.NEXT_PUBLIC_INSTAGRAM_EMBED_URL || "";
    if (!url) {
      setIgOAuthError("Instagram OAuth URL is not configured. Contact your administrator.");
      return;
    }
    setIgOAuthError("");

    const w = 600, h = 700;
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(
      url,
      "ig-oauth",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setIgOAuthError("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    setIgConnecting(true);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setIgConnecting(false);
        return;
      }
      try {
        const href = popup.location?.href ?? "";
        const isRedirected = href.includes("vaketta.com") || href.includes("localhost");
        if (!isRedirected) return;

        const code = new URLSearchParams(popup.location.search).get("code");
        clearInterval(timer);
        popup.close();

        if (!code) {
          setIgConnecting(false);
          setIgOAuthError("Instagram authorisation was cancelled. Please try again.");
          return;
        }

        apiFetch("/hotel-settings/instagram/oauth-exchange", {
          method: "POST",
          body:   JSON.stringify({ code }),
        })
          .then((data: any) => {
            console.log(`[Instagram OAuth] redirect_uri used in exchange: "${data.redirectUri}"`);
            setIg((prev) => ({
              ...prev,
              igAccountId: data.igAccountId ?? prev.igAccountId,
              connected:   true,
            }));
            setIgAdvancedOpen(true);
          })
          .catch((e: any) => {
            setIgOAuthError(e.message ?? "Failed to exchange Instagram token.");
          })
          .finally(() => setIgConnecting(false));
      } catch {
        // Cross-origin — popup still on instagram.com, keep polling
      }
    }, 500);
  }

  async function handleIgSubscribe() {
    setIgSubLoading(true);
    setIgSubError("");
    try {
      await apiFetch("/hotel-settings/instagram/subscribe", { method: "POST" });
      setIgSubStatus(true);
    } catch (err: any) {
      setIgSubError(err.message || "Failed to subscribe.");
    } finally {
      setIgSubLoading(false);
    }
  }

  async function handleIgUnsubscribe() {
    setIgSubLoading(true);
    setIgSubError("");
    try {
      await apiFetch("/hotel-settings/instagram/subscribe", { method: "DELETE" });
      setIgSubStatus(false);
    } catch (err: any) {
      setIgSubError(err.message || "Failed to unsubscribe.");
    } finally {
      setIgSubLoading(false);
    }
  }

  async function copyText(text: string, setCopiedFn: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 2000);
    } catch { /* clipboard unavailable or permission denied — silently ignore */ }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A3F91] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2B0D3E]">Hotel Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your property identity and guest-facing details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Identity ── */}
          <SectionCard
            title="Property Identity"
            subtitle="Basic details that identify your hotel across the platform."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hotel Name" hint="Shown in the dashboard header and guest messages.">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. The Grand Maadathil"
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="WhatsApp Number" hint="Tenant key — cannot be changed here.">
                <input
                  type="text"
                  value={form.phone}
                  readOnly
                  className={readonlyClass}
                />
              </Field>

              <Field label="Location / Address" hint="City, area, or full address shown to guests.">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Munnar, Kerala, India"
                  className={inputClass}
                />
              </Field>

              <Field label="Contact Email" hint="For booking confirmations and guest follow-ups.">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="reservations@yourhotel.com"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Website"
                hint="Optional — link to your direct booking or info page."
                >
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://yourhotel.com"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field
                label="Tagline / Description"
                hint="A short line about your property. Used in future guest-facing materials."
              >
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="e.g. A peaceful hill-station retreat surrounded by tea estates."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── Check-in / Check-out ── */}
          <SectionCard
            title="Check-in & Check-out Times"
            subtitle="Standard times displayed to guests during booking and confirmation."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Check-in Time" hint="Guests can arrive from this time.">
                <input
                  type="time"
                  value={form.checkInTime}
                  onChange={(e) => set("checkInTime", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Check-out Time" hint="Guests must vacate by this time.">
                <input
                  type="time"
                  value={form.checkOutTime}
                  onChange={(e) => set("checkOutTime", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── API Key ── */}
          {/* ── Message Delay ── */}
          <SectionCard
            title="Message Delay"
            subtitle="Add a short delay before messages are sent — lets you undo accidental sends."
          >
            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Enable message delay</p>
                  <p className="text-xs text-gray-400 mt-0.5">When on, outgoing messages wait before sending so you can cancel them.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDelayEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    delayEnabled ? "bg-[#7A3F91]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      delayEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Delay seconds input — only shown when enabled */}
              {delayEnabled && (
                <Field label="Delay duration" hint="How many seconds to wait before sending (1–60).">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(Math.max(1, Math.min(60, Number(e.target.value))))}
                      className={`${inputClass} w-24`}
                    />
                    <span className="text-sm text-gray-500">seconds</span>
                  </div>
                </Field>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDelaySave}
                  disabled={delaySaving}
                  className="flex items-center gap-2 rounded-lg bg-[#7A3F91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2B0D3E] disabled:opacity-50"
                >
                  {delaySaving ? (
                    <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                  ) : delaySaved ? (
                    <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Saved</>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Platform API Key"
            subtitle="Your hotel API key — used to authenticate WhatsApp webhook events."
          >
            <Field label="API Key" hint="Keep this secret. Regenerate from the Vaketta admin panel if compromised.">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.apiKey ?? "Not generated"}
                  readOnly
                  className={`${readonlyClass} font-mono text-xs tracking-wider`}
                />
                {form.apiKey && (
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            </Field>
          </SectionCard>

          {/* ── Save bar ── */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
            <p className="text-xs text-gray-400">
              Changes apply immediately across the dashboard.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#7A3F91] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B0D3E] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>

        {/* ── WhatsApp Integration (separate form) ── */}
        <form onSubmit={handleWaSave}>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="border-b border-gray-100 bg-linear-to-r from-[#e8f5e9] to-white px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a11.96 11.96 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 2.003A9.944 9.944 0 0 0 2 12c0 1.76.463 3.413 1.27 4.847L2 22l5.337-1.245A9.946 9.946 0 0 0 12.05 22C17.523 22 22 17.523 22 12.05 22 6.577 17.523 2 12.05 2v.003z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#2B0D3E]">WhatsApp Integration</h2>
                <p className="mt-0.5 text-xs text-gray-500">Connect Meta Business API to send and receive WhatsApp messages.</p>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
                wa.connected
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-gray-500 bg-gray-50 border-gray-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wa.connected ? "bg-green-500" : "bg-gray-400"}`} />
                {wa.connected ? "Connected" : "Not configured"}
              </span>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* ── 1. Recommended: Connect via Facebook ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border border-[#1877F2]/20 bg-[#1877F2]/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Connect WhatsApp <span className="text-xs font-normal text-green-600">(Recommended)</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">Use Facebook login to connect your WhatsApp Business account automatically.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFBConnect}
                    disabled={fbConnecting}
                    className="flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1464d8] disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ml-4 transition"
                  >
                    {fbConnecting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                      </svg>
                    )}
                    {fbConnecting ? "Connecting…" : "Connect via Facebook"}
                  </button>
                </div>
                {fbError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{fbError}</p>
                )}
              </div>

              {/* ── 2. Advanced Setup (collapsible) ── */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Advanced Setup <span className="text-xs font-normal text-gray-400">(for developers)</span>
                  <svg className={`w-4 h-4 ml-auto shrink-0 text-gray-400 transition-transform ${advancedOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {advancedOpen && (
                  <div className="px-4 pb-5 pt-1 space-y-4 border-t border-gray-100">

                    {/* Setup steps accordion */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setStepsOpen((v) => !v)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z"/>
                        </svg>
                        How to get your Meta credentials
                        <svg className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${stepsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {stepsOpen && (
                        <div className="px-4 pb-3 pt-1 text-xs text-blue-900">
                          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                            <li>Go to <strong>developers.facebook.com</strong> → My Apps → Create App → Business type.</li>
                            <li>Add the <strong>WhatsApp</strong> product to your app.</li>
                            <li>Under <em>WhatsApp &gt; API Setup</em>, copy the <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong>.</li>
                            <li>Generate a <strong>permanent system user access token</strong> with <code>whatsapp_business_messaging</code> permission in <em>Business Settings &gt; System Users</em>.</li>
                            <li>In <em>WhatsApp &gt; Configuration &gt; Webhook</em>, paste the Webhook URL below and your Verify Token, then click <strong>Verify &amp; Save</strong>.</li>
                            <li>Subscribe to webhook fields: <code>messages</code>.</li>
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Webhook URL */}
                    <Field label="Webhook URL" hint="Paste this in Meta's WhatsApp webhook configuration.">
                      <div className="flex gap-2">
                        <input type="text" value={WEBHOOK_URL} readOnly className={`${readonlyClass} font-mono text-xs`} />
                        <button
                          type="button"
                          onClick={() => copyText(WEBHOOK_URL, setCopiedWebhook)}
                          className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                          {copiedWebhook ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone Number ID" hint="Found in Meta → WhatsApp → API Setup.">
                        <input
                          type="text"
                          value={wa.metaPhoneNumberId}
                          onChange={(e) => setWa((w) => ({ ...w, metaPhoneNumberId: e.target.value }))}
                          placeholder="e.g. 123456789012345"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="WhatsApp Business Account ID" hint="Found next to Phone Number ID.">
                        <input
                          type="text"
                          value={wa.metaWabaId}
                          onChange={(e) => setWa((w) => ({ ...w, metaWabaId: e.target.value }))}
                          placeholder="e.g. 987654321098765"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Webhook Verify Token" hint="A secret string you choose — enter the same in Meta's webhook config.">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={wa.metaVerifyToken}
                            onChange={(e) => setWa((w) => ({ ...w, metaVerifyToken: e.target.value }))}
                            placeholder="e.g. my_secret_verify_token"
                            className={inputClass}
                          />
                          {wa.metaVerifyToken && (
                            <button
                              type="button"
                              onClick={() => copyText(wa.metaVerifyToken, setCopiedVerify)}
                              className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                            >
                              {copiedVerify ? "Copied!" : "Copy"}
                            </button>
                          )}
                        </div>
                      </Field>

                      <Field label="Access Token" hint="Permanent system user token with whatsapp_business_messaging scope.">
                        <div className="flex gap-2">
                          <input
                            type={showToken ? "text" : "password"}
                            value={wa.metaAccessToken}
                            onChange={(e) => setWa((w) => ({ ...w, metaAccessToken: e.target.value }))}
                            placeholder="EAAG…"
                            className={`${inputClass} font-mono text-xs`}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            title={showToken ? "Hide token" : "Show token"}
                            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                          >
                            {showToken ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </Field>
                    </div>

                    {waError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {waError}
                      </div>
                    )}

                    {/* Test result */}
                    {testResult && (
                      <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-center gap-2 ${
                        testResult === "success"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}>
                        {testResult === "success" ? (
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        )}
                        {testResult === "success" ? "Connection successful" : "Invalid credentials"}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-3">
                      <p className="text-xs text-gray-400">Credentials are stored securely and used to send outgoing messages.</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Test Connection */}
                        <button
                          type="button"
                          onClick={handleTest}
                          disabled={testing || !wa.connected}
                          title={!wa.connected ? "Save credentials first" : "Test the saved credentials"}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {testing ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          )}
                          {testing ? "Testing…" : "Test Connection"}
                        </button>

                        {/* Save */}
                        <button
                          type="submit"
                          disabled={waSaving}
                          className="flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1da851] disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition"
                        >
                          {waSaving ? (
                            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                          ) : waSaved ? (
                            <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Saved</>
                          ) : (
                            "Save WhatsApp Settings"
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>
        </form>

        {/* ── Instagram Integration (separate form) ── */}
        <form onSubmit={handleIgSave}>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3"
              style={{ background: "linear-gradient(to right, #fce4ec, #fff3e0, white)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-[#2B0D3E]">Instagram Integration</h2>
                <p className="mt-0.5 text-xs text-gray-500">Connect your Instagram Business account to send and receive DMs.</p>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
                ig.connected
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-gray-500 bg-gray-50 border-gray-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ig.connected ? "bg-green-500" : "bg-gray-400"}`} />
                {ig.connected ? "Connected" : "Not configured"}
              </span>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* ── Connect via Instagram ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{ borderColor: "#d6249f33", background: "linear-gradient(to right, #fdf0fa, #fff8f0)" }}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Connect Instagram <span className="text-xs font-normal text-green-600">(Recommended)</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Use Instagram login to connect your Business account automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleIgConnect}
                    disabled={igConnecting}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ml-4 transition"
                    style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
                  >
                    {igConnecting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                      </svg>
                    )}
                    {igConnecting ? "Connecting…" : "Connect via Instagram"}
                  </button>
                </div>
                {igOAuthError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{igOAuthError}</p>
                )}
              </div>

              {/* ── Webhook Subscription ── */}
              {ig.connected && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Webhook Subscription</p>
                        <p className="text-xs text-gray-400 mt-0.5">Receive Instagram DMs in real time via Meta webhook.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {igSubStatus === null ? (
                        <span className="text-xs text-gray-400">Checking…</span>
                      ) : (
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          igSubStatus
                            ? "text-green-700 bg-green-50 border-green-200"
                            : "text-red-600 bg-red-50 border-red-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${igSubStatus ? "bg-green-500" : "bg-red-400"}`} />
                          {igSubStatus ? "Subscribed" : "Not subscribed"}
                        </span>
                      )}
                      {igSubStatus ? (
                        <button
                          type="button"
                          onClick={handleIgUnsubscribe}
                          disabled={igSubLoading}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          {igSubLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />}
                          {igSubLoading ? "…" : "Unsubscribe"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleIgSubscribe}
                          disabled={igSubLoading}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                          style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
                        >
                          {igSubLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                          {igSubLoading ? "…" : "Subscribe"}
                        </button>
                      )}
                    </div>
                  </div>
                  {igSubError && (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                      {igSubError}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible credentials panel */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIgAdvancedOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Credentials Setup
                  <svg className={`w-4 h-4 ml-auto shrink-0 text-gray-400 transition-transform ${igAdvancedOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {igAdvancedOpen && (
                  <div className="px-4 pb-5 pt-1 space-y-4 border-t border-gray-100">

                    {/* Webhook URL */}
                    <Field label="Webhook URL" hint="Paste this in Meta's Instagram webhook configuration.">
                      <div className="flex gap-2">
                        <input type="text" value={INSTAGRAM_WEBHOOK_URL} readOnly className={`${readonlyClass} font-mono text-xs`} />
                        <button
                          type="button"
                          onClick={() => copyText(INSTAGRAM_WEBHOOK_URL, setCopiedWebhook)}
                          className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                          {copiedWebhook ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Instagram Account ID" hint="Your Instagram Business Account ID from Meta Business Suite.">
                        <input
                          type="text"
                          value={ig.igAccountId}
                          onChange={(e) => setIg((v) => ({ ...v, igAccountId: e.target.value }))}
                          placeholder="e.g. 17841400000000000"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Page Access Token" hint="Permanent token with instagram_manage_messages permission.">
                        <div className="flex gap-2">
                          <input
                            type={showIgToken ? "text" : "password"}
                            value={ig.accessToken}
                            onChange={(e) => setIg((v) => ({ ...v, accessToken: e.target.value }))}
                            placeholder="EAAg…"
                            className={`${inputClass} font-mono text-xs`}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => setShowIgToken((v) => !v)}
                            title={showIgToken ? "Hide token" : "Show token"}
                            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                          >
                            {showIgToken ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </Field>
                    </div>

                    {igError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {igError}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-3">
                      <p className="text-xs text-gray-400">Credentials are stored securely and used to send outgoing Instagram messages.</p>
                      <button
                        type="submit"
                        disabled={igSaving}
                        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 shrink-0"
                        style={{ background: "linear-gradient(135deg, #d6249f, #fd5949)" }}
                      >
                        {igSaving ? (
                          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                        ) : igSaved ? (
                          <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Saved</>
                        ) : (
                          "Save Instagram Settings"
                        )}
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
