"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Plan = {
  id: string;
  name: string;
  currency: string;
  country: string;
  priceMonthly: number;
};

function getCurrencySymbol(code: string) {
  const map: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ",
    SAR: "﷼", SGD: "S$", MYR: "RM", THB: "฿", AUD: "A$",
    CAD: "C$", JPY: "¥", IDR: "Rp", PHP: "₱", LKR: "Rs", NPR: "रू", QAR: "QR",
  };
  return map[code] ?? code;
}

function priceDisplay(minor: number, currency: string) {
  return `${getCurrencySymbol(currency)}${(minor / 100).toLocaleString()}`;
}

// ── Floating orb background ───────────────────────────────────────────────────
function Orbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[#1B52A8]/20 blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 -right-32 h-[400px] w-[400px] rounded-full bg-[#B8912E]/15 blur-[100px]" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-[#1B52A8]/10 blur-[90px]" />
    </div>
  );
}

export default function GetStartedPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", hotelName: "", country: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/public/plans`)
      .then((r) => r.json())
      .then((data: Plan[]) => {
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0]!.id);
      })
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.hotelName.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId: selectedPlan || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="relative min-h-screen bg-[#0C1B33] flex items-center justify-center px-6">
        <Orbs />
        <div className="relative z-10 text-center max-w-lg">
          {/* Animated checkmark */}
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-[#B8912E]/30 bg-[#B8912E]/10">
            <svg className="h-12 w-12 text-[#B8912E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">You're on the list!</h1>
          <p className="text-white/60 leading-relaxed mb-8">
            Thanks for your interest in Vaketta. Our team will review your request and reach out within 24 hours to get you set up.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0C1B33]">
      <Orbs />

      {/* Nav */}
      <header className="relative z-10 flex h-16 items-center justify-between px-8 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/vakettaVlogo.png" alt="Vaketta" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-white">Vaketta</span>
        </Link>
        <Link href="/login" className="text-sm text-white/50 hover:text-white transition">
          Sign in →
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-start">

          {/* ── Left: copy ────────────────────────────────────────────────── */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B8912E]/30 bg-[#B8912E]/10 px-4 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8912E] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#B8912E]">Early access</span>
            </div>

            <h1 className="text-4xl font-bold text-white leading-tight mb-6 lg:text-5xl">
              Let's get your<br />
              <span className="bg-gradient-to-r from-[#B8912E] to-[#e4b84a] bg-clip-text text-transparent">
                business automated.
              </span>
            </h1>
            <p className="text-white/60 leading-relaxed mb-10 text-lg">
              Fill in your details and select a plan. Our team will verify your account and have you live within 24 hours — no technical setup needed.
            </p>

            {/* Steps */}
            <div className="space-y-5">
              {[
                { n: "1", title: "Submit this form", body: "Tell us about your property and choose a plan." },
                { n: "2", title: "We verify & create your account", body: "Our team reviews and sets up your hotel in the system." },
                { n: "3", title: "You go live", body: "Log in, connect WhatsApp, and start automating." },
              ].map((s) => (
                <div key={s.n} className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B8912E]/15 border border-[#B8912E]/30 text-sm font-bold text-[#B8912E]">
                    {s.n}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{s.title}</p>
                    <p className="text-white/45 text-sm mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: form ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Request access</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plan selector */}
              {plans.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
                    Select a plan
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedPlan === plan.id
                            ? "border-[#B8912E] bg-[#B8912E]/10"
                            : "border-white/10 bg-white/4 hover:border-white/20"
                        }`}
                      >
                        <p className={`text-sm font-bold ${selectedPlan === plan.id ? "text-[#B8912E]" : "text-white"}`}>
                          {plan.name}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {priceDisplay(plan.priceMonthly, plan.currency)}/mo
                        </p>
                      </button>
                    ))}
                  </div>
                  {plans.length === 0 && (
                    <p className="text-xs text-white/30 mt-1">Plans will be shown once available</p>
                  )}
                </div>
              )}

              {/* Name */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                    Your name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                    Hotel / property name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.hotelName}
                    onChange={(e) => set("hotelName", e.target.value)}
                    placeholder="Sunrise Beach Resort"
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Work email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@yourhotel.com"
                  className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                  required
                />
              </div>

              {/* Phone + Country */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                    WhatsApp number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    placeholder="India"
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  Anything we should know? <span className="text-white/25 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="How many rooms, current tools you use, specific questions..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#B8912E]/50 focus:outline-none focus:ring-1 focus:ring-[#B8912E]/30 transition"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8912E] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#B8912E]/20 transition hover:bg-[#a07a26] disabled:opacity-60"
              >
                {submitting && (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {submitting ? "Submitting…" : "Request access →"}
              </button>

              <p className="text-center text-xs text-white/25">
                No payment required. We'll contact you within 24 hours.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
