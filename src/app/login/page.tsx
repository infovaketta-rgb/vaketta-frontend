"use client";
import { useState } from "react";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || "https://niko-unsinged-literarily.ngrok-free.dev"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!res.ok) throw new Error("Invalid credentials");

      const data = await res.json();

      localStorage.setItem("TOKEN",        data.token);
      localStorage.setItem("USER_ROLE",    data.user.role);
      localStorage.setItem("HOTEL_ID",     data.user.hotelId);
      if (data.user.name)          localStorage.setItem("USER_NAME",    data.user.name);
      if (data.user.email)         localStorage.setItem("USER_EMAIL",   data.user.email);
      if (data.user.hotel?.apiKey) localStorage.setItem("HOTEL_API_KEY", data.user.hotel.apiKey);
      if (data.user.hotel?.name)   localStorage.setItem("HOTEL_NAME",   data.user.hotel.name);

      location.href = "/dashboard";
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div className="flex h-screen w-full">
      {/* ── Left panel – brand ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0C1B33] px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B8912E]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">Vaketta PMS</p>
            <p className="text-[11px] text-white/40">Hotel Management System</p>
          </div>
        </div>

        {/* Center copy */}
        <div className="space-y-6">
          <div className="h-px w-12 bg-[#B8912E]" />
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-white">
            Manage your<br />
            <span className="text-[#B8912E]">property</span> with<br />
            confidence.
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            One platform for bookings, guest messaging, room management, and real-time analytics — built for modern hospitality.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-col gap-3">
          {[
            "Real-time WhatsApp guest communication",
            "Smart booking & availability management",
            "Role-based access for your entire team",
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

      {/* ── Right panel – login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F4F2ED] px-6">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C1B33]">
            <svg className="h-4 w-4 text-[#B8912E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-base font-bold text-[#0C1B33]">Vaketta PMS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#0C1B33]">Welcome back</h2>
            <p className="mt-1.5 text-sm text-[#64748B]">Sign in to your hotel dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/60 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@hotel.com"
                className="w-full rounded-xl border border-[#E5E0D4] bg-white px-4 py-3 text-sm text-[#0C1B33] placeholder-slate-400 shadow-sm transition focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0C1B33]/60 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E5E0D4] bg-white px-4 py-3 text-sm text-[#0C1B33] placeholder-slate-400 shadow-sm transition focus:border-[#1B52A8] focus:outline-none focus:ring-2 focus:ring-[#1B52A8]/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#1B52A8] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163F82] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-[#64748B]">
            Vaketta PMS &mdash; Secure hotel management platform
          </p>
        </div>
      </div>
    </div>
  );
}
