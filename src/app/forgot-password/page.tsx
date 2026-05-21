"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const devHeaders: Record<string, string> =
  process.env.NODE_ENV === "development" ? { "ngrok-skip-browser-warning": "true" } : {};

const inputClass =
  "w-full rounded-xl border border-[#E5E0D4] bg-white px-4 py-3 text-sm text-[#0C1B33] placeholder-slate-400 shadow-sm transition focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/60 mb-1.5";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode() {
    setError("");
    setNotice("");
    if (!email) return setError("Please enter your email address.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...devHeaders },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setNotice("If an account exists for that email, a 6-digit code is on its way. Check your inbox.");
      setStep("reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your email.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    if (newPassword !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...devHeaders },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not reset password.");
      router.push("/login?reset=1");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent, fn: () => void) {
    if (e.key === "Enter") fn();
  }

  return (
    <div className="flex h-screen w-full">
      {/* ── Left panel – brand ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0C1B33] px-12 py-10">
        <div className="flex items-center gap-3">
          <img src="/vchat icon.png" alt="Vaketta" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-base font-bold tracking-tight text-white">Vaketta Chat</p>
            <p className="text-[11px] text-white/40">Hotel Automation</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-px w-12 bg-[#B8912E]" />
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-white">
            Reset your<br />
            <span className="text-[#B8912E]">password</span> securely.
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            We&apos;ll email you a one-time verification code. Enter it along with a new password to
            regain access to your dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            "6-digit code sent to your email",
            "Code expires in 10 minutes",
            "All sessions sign out after reset",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-white/60">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#B8912E]/20">
                <svg className="h-2.5 w-2.5 text-[#B8912E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel – form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F4F2ED] px-6">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src="/vchat icon.png" alt="Vaketta" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold text-[#0C1B33]">Vaketta Chat</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#0C1B33]">
              {step === "email" ? "Forgot password?" : "Enter your code"}
            </h2>
            <p className="mt-1.5 text-sm text-[#64748B]">
              {step === "email"
                ? "Enter your account email and we'll send a reset code."
                : `We sent a 6-digit code to ${email}.`}
            </p>
          </div>

          {notice && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {step === "email" ? (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, requestCode)}
                  placeholder="you@hotel.com"
                  className={inputClass}
                />
              </div>
              <button
                onClick={requestCode}
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#1B52A8] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Sending code…" : "Send reset code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className={`${inputClass} tracking-[0.5em] text-center font-semibold`}
                />
              </div>
              <div>
                <label className={labelClass}>New password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm new password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, resetPassword)}
                  placeholder="Re-enter new password"
                  className={inputClass}
                />
              </div>
              <button
                onClick={resetPassword}
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#1B52A8] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
              <button
                onClick={requestCode}
                disabled={loading}
                className="w-full text-center text-xs font-medium text-[#64748B] transition hover:text-[#1B52A8] disabled:opacity-60"
              >
                Didn&apos;t get a code? Resend
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-[#64748B]">
            Remember your password?{" "}
            <a href="/login" className="font-semibold text-[#1B52A8] hover:underline">
              Back to sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
