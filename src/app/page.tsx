"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ── CSS keyframes injected once ───────────────────────────────────────────────
const GLOBAL_STYLES = `
@keyframes float {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  33%      { transform: translateY(-18px) rotate(1deg); }
  66%      { transform: translateY(-8px) rotate(-1deg); }
}
@keyframes floatB {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  50%      { transform: translateY(-24px) rotate(-2deg); }
}
@keyframes floatC {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-12px); }
}
@keyframes orbPulse {
  0%,100% { opacity:.18; transform:scale(1); }
  50%      { opacity:.32; transform:scale(1.12); }
}
@keyframes gradShift {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes ticker {
  0%   { transform:translateX(0); }
  100% { transform:translateX(-50%); }
}
@keyframes spin3d {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
@keyframes borderGlow {
  0%,100% { box-shadow: 0 0 0 0 rgba(184,145,46,.0); }
  50%      { box-shadow: 0 0 30px 4px rgba(184,145,46,.25); }
}
.anim-float  { animation: float  6s ease-in-out infinite; }
.anim-floatB { animation: floatB 8s ease-in-out infinite; }
.anim-floatC { animation: floatC 5s ease-in-out infinite; }
.anim-orb    { animation: orbPulse 4s ease-in-out infinite; }
.anim-fadeUp { animation: fadeUp .7s ease both; }
.reveal      { opacity:0; transform:translateY(28px); transition: opacity .65s ease, transform .65s ease; }
.reveal.in   { opacity:1; transform:none; }
.card3d      { transition: transform .4s ease, box-shadow .4s ease; transform-style: preserve-3d; }
.card3d:hover{ transform: perspective(700px) rotateY(-6deg) rotateX(3deg) scale(1.03); box-shadow:0 32px 64px rgba(0,0,0,.25); }
`;

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let n = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => { n = Math.min(n + step, to); setVal(n); if (n >= to) clearInterval(t); }, 16);
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#0C1B33]/95 backdrop-blur-xl border-b border-white/8 shadow-2xl" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-[#B8912E]/30 blur-md group-hover:blur-lg transition-all" />
            <img src="/vakettaVlogo.png" alt="Vaketta" className="relative h-8 w-8 object-contain" />
          </div>
          <span className="text-lg font-bold text-white">Vaketta</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {["Product","How it works","Pricing"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g,"-")}`}
              className="text-sm font-medium text-white/60 transition hover:text-white relative group">
              {item}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#B8912E] transition-all group-hover:w-full" />
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-white/50 hover:text-white transition">Sign in</Link>
          <Link href="/get-started"
            className="relative overflow-hidden rounded-lg bg-[#B8912E] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#B8912E]/30 transition hover:shadow-[#B8912E]/50 hover:scale-105 active:scale-95">
            <span className="absolute inset-0 -translate-x-full bg-white/20 skew-x-12 transition-transform hover:translate-x-full duration-700" />
            Get started
          </Link>
        </div>
        <button onClick={() => setOpen(v => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white md:hidden">
          {open
            ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#0C1B33]/95 backdrop-blur-xl px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {["Product","How it works","Pricing"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g,"-")}`} onClick={() => setOpen(false)}
                className="text-sm font-medium text-white/70">{item}</a>
            ))}
            <hr className="border-white/10" />
            <Link href="/login" className="text-sm font-medium text-white/60">Sign in</Link>
            <Link href="/get-started" className="rounded-lg bg-[#B8912E] px-4 py-2.5 text-center text-sm font-bold text-white">Get started free</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── 3D Dashboard card mockup ──────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl" style={{ perspective: "1200px" }}>
      {/* Main card */}
      <div className="relative rounded-2xl border border-white/15 bg-[#0f2545]/80 shadow-2xl backdrop-blur-md overflow-hidden"
        style={{ transform: "rotateY(-8deg) rotateX(6deg)", transformStyle: "preserve-3d", boxShadow: "0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)" }}>
        {/* Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/6 to-transparent" style={{ animation: "shimmer 3s ease-in-out infinite" }} />
        </div>
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-400/70" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-white/30 font-mono">Vaketta Chat — Dashboard</span>
        </div>
        <div className="p-4 space-y-3">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Messages today", val: "1,284", color: "text-[#B8912E]" },
              { label: "Active bookings", val: "47", color: "text-emerald-400" },
              { label: "Revenue (MTD)", val: "₹2.4L", color: "text-[#7BA7FF]" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-white/5 p-3">
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Chart bars */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-3">
            <p className="text-[10px] font-semibold text-white/40 mb-2 uppercase tracking-widest">Revenue — last 7 days</p>
            <div className="flex items-end gap-1.5 h-14">
              {[40,65,50,80,60,90,75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all"
                  style={{ height: `${h}%`, background: `linear-gradient(to top, #B8912E, #e4b84a)`, opacity: .7 + i*.04 }} />
              ))}
            </div>
          </div>
          {/* Message list */}
          <div className="space-y-1.5">
            {[
              { name: "Anjali S.", msg: "What time is check-out?", time: "2m", status: "auto-replied" },
              { name: "Rohan M.", msg: "I'd like to book a room…",  time: "8m", status: "pending" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                <div className="h-7 w-7 rounded-full bg-[#1B52A8]/40 flex items-center justify-center text-xs font-bold text-white/70">{m.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80">{m.name}</p>
                  <p className="text-[10px] text-white/35 truncate">{m.msg}</p>
                </div>
                <span className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 ${m.status === "auto-replied" ? "bg-emerald-400/15 text-emerald-400" : "bg-yellow-400/15 text-yellow-400"}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification card */}
      <div className="absolute -top-6 -right-8 anim-float rounded-xl border border-white/15 bg-[#0f2545]/90 backdrop-blur-md px-3 py-2.5 shadow-xl hidden sm:block"
        style={{ transform: "rotateY(-4deg) rotateX(3deg)" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-emerald-400/20 flex items-center justify-center">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/80">Booking confirmed</p>
            <p className="text-[9px] text-white/35">Room 204 · 3 nights</p>
          </div>
        </div>
      </div>

      {/* Floating AI badge */}
      <div className="absolute -bottom-5 -left-6 anim-floatB rounded-xl border border-[#B8912E]/30 bg-[#B8912E]/15 backdrop-blur-md px-3 py-2 shadow-xl hidden sm:block">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B8912E] animate-pulse" />
          <p className="text-[10px] font-semibold text-[#B8912E]">AI replied · 0.3s</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useReveal();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <div className="min-h-screen bg-[#070E1C] font-sans text-white antialiased overflow-x-hidden">
        <Nav />

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center overflow-hidden px-6 pt-16">
          {/* Mesh gradient background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-0 right-0 h-full"
              style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1B52A8 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2"
              style={{ background: "radial-gradient(ellipse 60% 50% at 20% 100%, #B8912E22 0%, transparent 70%)" }} />
            <div className="absolute top-1/3 right-0 w-1/2 h-1/2"
              style={{ background: "radial-gradient(ellipse 50% 60% at 90% 40%, #1B52A830 0%, transparent 70%)" }} />
          </div>

          {/* Animated grid */}
          <div className="pointer-events-none absolute inset-0 opacity-[.04]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

          {/* Floating orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="anim-orb absolute top-1/4 left-1/3 h-80 w-80 rounded-full bg-[#1B52A8] blur-[100px]" />
            <div className="anim-orb absolute top-2/3 right-1/4 h-64 w-64 rounded-full bg-[#B8912E] blur-[90px]" style={{ animationDelay: "2s" }} />
            <div className="anim-orb absolute top-1/2 left-0 h-48 w-48 rounded-full bg-[#1B52A8] blur-[80px]" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative mx-auto w-full max-w-6xl py-20">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              {/* Left copy */}
              <div className="text-center lg:text-left">
                <div className="anim-fadeUp inline-flex items-center gap-2 rounded-full border border-[#B8912E]/40 bg-[#B8912E]/10 px-4 py-1.5 mb-7">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B8912E] animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#B8912E]">Now in early access</span>
                </div>

                <h1 className="anim-fadeUp text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl"
                  style={{ animationDelay: ".1s",
                    background: "linear-gradient(135deg,#fff 40%,#B8912E 100%)",
                    backgroundSize: "200% 200%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "gradShift 5s ease infinite, fadeUp .7s ease both .1s" }}>
                  Run your hotel.<br />Without the chaos.
                </h1>

                <p className="anim-fadeUp mt-6 max-w-lg mx-auto lg:mx-0 text-lg leading-relaxed text-white/55"
                  style={{ animationDelay: ".25s" }}>
                  Vaketta automates guest communication, bookings, and operations — all from one dashboard. Powered by WhatsApp AI.
                </p>

                <div className="anim-fadeUp mt-9 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                  style={{ animationDelay: ".35s" }}>
                  <Link href="/get-started"
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#B8912E] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#B8912E]/30 transition-all hover:scale-105 hover:shadow-[#B8912E]/50 active:scale-95">
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition" />
                    Start for free
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <a href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white">
                    See how it works
                  </a>
                </div>

                <p className="anim-fadeUp mt-5 text-xs text-white/25" style={{ animationDelay: ".45s" }}>
                  No credit card required · Setup in under 10 minutes
                </p>
              </div>

              {/* Right: 3D mockup */}
              <div className="anim-fadeUp hidden lg:block" style={{ animationDelay: ".3s" }}>
                <DashboardMockup />
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-20 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/5">
              {[
                { label: "Messages automated daily", value: 10, suffix: "k+" },
                { label: "Hours saved per week", value: 40, suffix: "+" },
                { label: "Customer satisfaction", value: 98, suffix: "%" },
              ].map((s) => (
                <div key={s.label} className="bg-white/3 px-6 py-6 text-center backdrop-blur-sm hover:bg-white/6 transition">
                  <div className="text-3xl font-extrabold text-white"><Counter to={s.value} suffix={s.suffix} /></div>
                  <div className="mt-1 text-xs text-white/35">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TICKER ──────────────────────────────────────────────────────── */}
        <div className="border-y border-white/6 bg-white/3 py-3 overflow-hidden">
          <div className="flex whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
            {[...Array(2)].map((_, k) => (
              <div key={k} className="flex items-center gap-8 px-4">
                {["WhatsApp Automation","AI-Powered Replies","Booking Management","Live Dashboard","Guest Communication","Revenue Analytics","Custom Flows","24/7 Operations"].map((t) => (
                  <span key={t} className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                    <span className="h-1 w-1 rounded-full bg-[#B8912E]" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── PROBLEM ─────────────────────────────────────────────────────── */}
        <section className="px-6 py-28 bg-[#070E1C]">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">The problem</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">
                Running a hotel is hard enough.<br />Your tools shouldn't make it harder.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: "⏰", title: "Too much time on repetitive tasks",
                  body: "Your team spends hours every day answering the same questions, copying data, and chasing follow-ups." },
                { icon: "🔀", title: "Scattered tools that don't talk",
                  body: "Bookings in one place, messages in another, ops in a spreadsheet. Things fall through the cracks." },
                { icon: "📉", title: "Growth is limited by capacity",
                  body: "You can't scale without adding more staff. Every new guest adds pressure without automation." },
              ].map((c, i) => (
                <div key={c.title} className="reveal card3d rounded-2xl border border-white/8 bg-white/4 p-6" style={{ transitionDelay: `${i * .1}s` }}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">{c.icon}</div>
                  <h3 className="mb-2 font-bold text-white">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-white/45">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <section className="px-6 py-28 bg-linear-to-b from-[#0a1628] to-[#070E1C]">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">The solution</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">
                One platform. Every operation.<br />Fully automated.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { icon: "💬", title: "Automate guest communication",
                  body: "Connect WhatsApp. Vaketta handles incoming messages, answers questions, and routes complex requests to your team — 24 hours a day.",
                  grad: "from-[#1B52A8]/20 to-transparent" },
                { icon: "📅", title: "Manage bookings without the chaos",
                  body: "Guests book directly through chat. Your team sees availability, confirmations, cancellations, and guest history in one place.",
                  grad: "from-emerald-500/15 to-transparent" },
                { icon: "⚡", title: "Build workflows without code",
                  body: "Design multi-step conversation flows using a visual editor. No developers needed. Deploy in minutes, change any time.",
                  grad: "from-[#B8912E]/15 to-transparent" },
                { icon: "📊", title: "See everything in real time",
                  body: "Live dashboards show conversations, bookings, revenue, and team activity. Make decisions with data that's always current.",
                  grad: "from-purple-500/15 to-transparent" },
              ].map((c, i) => (
                <div key={c.title} className={`reveal card3d relative overflow-hidden rounded-2xl border border-white/8 p-6 bg-linear-to-br ${c.grad} bg-white/4`}
                  style={{ transitionDelay: `${i * .1}s` }}>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
                      style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,.06), transparent 70%)" }} />
                  </div>
                  <div className="mb-4 text-3xl">{c.icon}</div>
                  <h3 className="mb-2 font-bold text-white text-lg">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT MODULES ─────────────────────────────────────────────── */}
        <section id="product" className="px-6 py-28 bg-[#070E1C]">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Products</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">
                Start with what you need.<br />Expand when you're ready.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { name: "Vaketta Chat", tag: "Communication", tagColor: "text-[#7BA7FF] bg-[#1B52A8]/20",
                  desc: "Automate guest conversations on WhatsApp. AI handles questions around the clock — your team steps in when it matters.",
                  features: ["WhatsApp & Instagram","AI-powered replies","Live handoff","Message history"], icon: "💬", featured: false },
                { name: "Vaketta PMS", tag: "Property Management", tagColor: "text-[#B8912E] bg-[#B8912E]/15",
                  desc: "A property management system built for hotels. Manage rooms, bookings, and guests from one clean dashboard.",
                  features: ["Booking management","Room availability","Guest records","Revenue analytics"], icon: "🏨", featured: true },
                { name: "Vaketta Flow", tag: "Workflow Builder", tagColor: "text-emerald-400 bg-emerald-400/15",
                  desc: "Build automated conversation flows using a visual drag-and-drop editor. No code required.",
                  features: ["Visual flow editor","Conditional logic","Form collection","Action triggers"], icon: "🔀", featured: false },
              ].map((p, i) => (
                <div key={p.name}
                  className={`reveal card3d relative flex flex-col rounded-2xl border p-6 transition-all ${p.featured ? "border-[#B8912E]/50 bg-linear-to-b from-[#B8912E]/8 to-[#B8912E]/3" : "border-white/8 bg-white/4"}`}
                  style={{ transitionDelay: `${i * .12}s` }}>
                  {p.featured && (
                    <>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B8912E] px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[#B8912E]/40">Most popular</div>
                      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ animation: "borderGlow 3s ease-in-out infinite" }} />
                    </>
                  )}
                  <div className="mb-4 text-4xl">{p.icon}</div>
                  <span className={`mb-3 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${p.tagColor}`}>{p.tag}</span>
                  <h3 className="mb-2 text-lg font-bold text-white">{p.name}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-white/45">{p.desc}</p>
                  <ul className="mt-auto space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#B8912E]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-28 bg-linear-to-b from-[#0a1628] to-[#070E1C]">
          <div className="mx-auto max-w-4xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">How it works</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">Up and running in three steps.</h2>
            </div>
            <div className="relative space-y-8">
              <div className="absolute left-7 top-10 hidden h-[calc(100%-80px)] w-px bg-linear-to-b from-[#1B52A8] via-[#B8912E] to-transparent md:block" />
              {[
                { step: "01", title: "Submit your details", body: "Fill out a quick form. Tell us about your property and choose a plan. Our team verifies and creates your account." },
                { step: "02", title: "Connect WhatsApp", body: "Link your WhatsApp Business account. We guide you through every step — no developer needed." },
                { step: "03", title: "Watch it run itself", body: "Vaketta handles messages, qualifies leads, processes bookings, and updates your dashboard automatically." },
              ].map((s, i) => (
                <div key={s.step} className={`reveal flex items-start gap-6 md:gap-10 ${i === 1 ? "md:flex-row-reverse" : ""}`}
                  style={{ transitionDelay: `${i * .15}s` }}>
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0C1B33] border border-[#B8912E]/30 text-lg font-extrabold text-[#B8912E] shadow-xl shadow-[#B8912E]/10">
                    {s.step}
                    <div className="absolute inset-0 rounded-2xl bg-[#B8912E]/5" />
                  </div>
                  <div className={`flex-1 rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm ${i === 1 ? "md:text-right" : ""}`}>
                    <h3 className="mb-2 text-lg font-bold text-white">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-white/45">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENEFITS ────────────────────────────────────────────────────── */}
        <section className="px-6 py-28 bg-[#070E1C]">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Benefits</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">The impact from day one.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { metric: "70%", title: "Fewer repetitive messages", body: "Vaketta handles FAQs, booking enquiries, and status updates automatically." },
                { metric: "3×",  title: "Faster response times",     body: "Guests get instant replies at any hour — no more waiting until next business day." },
                { metric: "∞",   title: "Scale without headcount",   body: "Handle 10 conversations or 10,000. The system performs exactly the same." },
                { metric: "100%",title: "Full conversation history",  body: "Every message, booking, and interaction stored and searchable." },
                { metric: "24/7",title: "Always available",           body: "Guests can get help and make bookings even when your team is offline." },
                { metric: "<10m",title: "Setup time",                 body: "Connect WhatsApp, configure your first flow, and go live in under 10 minutes." },
              ].map((b, i) => (
                <div key={b.title} className="reveal card3d rounded-2xl border border-white/8 bg-white/4 p-6" style={{ transitionDelay: `${i * .07}s` }}>
                  <div className="mb-3 text-3xl font-extrabold bg-linear-to-r from-[#B8912E] to-[#e4b84a] bg-clip-text text-transparent">{b.metric}</div>
                  <h3 className="mb-1.5 font-bold text-white">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-white/40">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
        <section className="px-6 py-28 bg-linear-to-b from-[#0a1628] to-[#070E1C]">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">What people say</p>
              <h2 className="text-3xl font-bold text-white">Trusted by operators who care about efficiency.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { quote: "We used to miss WhatsApp messages all the time. Now Vaketta replies instantly. Guest satisfaction is up noticeably.", name: "Priya M.", role: "Owner, boutique guesthouse · Goa" },
                { quote: "The booking flow alone saves us two hours every day. Guests confirm through WhatsApp without our staff lifting a finger.", name: "Arjun K.", role: "Operations Manager · Munnar Hill Resort" },
                { quote: "I was sceptical about automation, but the setup was so simple. It genuinely feels like we hired an extra team member.", name: "Fatima R.", role: "Director · Varkala Beach Hotel" },
              ].map((t, i) => (
                <div key={t.name} className="reveal card3d flex flex-col rounded-2xl border border-white/8 bg-white/4 p-6" style={{ transitionDelay: `${i * .12}s` }}>
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="h-4 w-4 text-[#B8912E]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-white/55 italic">"{t.quote}"</p>
                  <div className="mt-5 border-t border-white/8 pt-4">
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────────────── */}
        <section id="pricing" className="px-6 py-28 bg-[#070E1C]">
          <div className="mx-auto max-w-3xl text-center">
            <div className="reveal">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Pricing</p>
              <h2 className="text-3xl font-bold md:text-4xl text-white">Simple pricing. No surprises.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
                Start with a free trial. Upgrade when you're ready. Every plan includes all core features.
              </p>
            </div>
            <div className="reveal mt-10 grid gap-4 sm:grid-cols-3" style={{ transitionDelay: ".15s" }}>
              {[
                { name: "Trial", price: "Free", period: "14 days", features: ["500 conversations","200 AI replies","All modules included"], cta: "Start free trial", featured: false },
                { name: "Starter", price: "₹2,499", period: "per month", features: ["2,000 conversations","1,000 AI replies","Priority support"], cta: "Get started", featured: true },
                { name: "Growth", price: "₹5,999", period: "per month", features: ["Unlimited conversations","Unlimited AI replies","Dedicated support"], cta: "Get started", featured: false },
              ].map((plan) => (
                <div key={plan.name}
                  className={`card3d rounded-2xl border p-6 text-left relative overflow-hidden ${plan.featured ? "border-[#B8912E]/50 bg-linear-to-b from-[#B8912E]/10 to-[#B8912E]/3" : "border-white/8 bg-white/4"}`}>
                  {plan.featured && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ animation: "borderGlow 3s ease-in-out infinite" }} />}
                  <p className={`mb-1 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-[#B8912E]" : "text-white/30"}`}>{plan.name}</p>
                  <div className="mb-1 flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  </div>
                  <p className={`mb-5 text-xs ${plan.featured ? "text-white/40" : "text-white/25"}`}>{plan.period}</p>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white/55">
                        <svg className={`h-3.5 w-3.5 shrink-0 ${plan.featured ? "text-[#B8912E]" : "text-white/30"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/get-started"
                    className={`block rounded-lg py-2.5 text-center text-sm font-bold transition hover:scale-105 active:scale-95 ${plan.featured ? "bg-[#B8912E] text-white shadow-lg shadow-[#B8912E]/30 hover:bg-[#a07a26]" : "border border-white/15 text-white/70 hover:border-white/30 hover:text-white"}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-36 text-center bg-[#070E1C]">
          <div className="pointer-events-none absolute inset-0">
            <div className="anim-orb absolute left-1/2 top-0 h-125 w-175 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1B52A8] blur-[120px]" />
            <div className="anim-orb absolute bottom-0 left-1/4 h-[300px] w-[400px] translate-y-1/2 rounded-full bg-[#B8912E] blur-[100px]" style={{ animationDelay: "2s" }} />
          </div>
          {/* Animated grid lines */}
          <div className="pointer-events-none absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative reveal">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Get started today</p>
            <h2 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl"
              style={{ background: "linear-gradient(135deg,#fff 50%,#B8912E 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your hotel deserves to run better.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/40">
              Join hotels already using Vaketta to automate operations and serve guests better.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/get-started"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#B8912E] px-10 py-4 text-sm font-bold text-white shadow-2xl shadow-[#B8912E]/30 transition-all hover:scale-105 hover:shadow-[#B8912E]/50 active:scale-95">
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition" />
                Start your free trial
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a href="mailto:support@vaketta.com"
                className="rounded-xl border border-white/15 px-10 py-4 text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                Talk to us
              </a>
            </div>
            <p className="mt-6 text-xs text-white/20">No credit card required · Cancel anytime · Setup in minutes</p>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/8 bg-[#040A14] px-6 py-14">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
              <div className="max-w-xs">
                <div className="mb-3 flex items-center gap-2.5">
                  <img src="/vakettaVlogo.png" alt="Vaketta" className="h-7 w-7 object-contain" />
                  <span className="text-base font-bold text-white">Vaketta</span>
                </div>
                <p className="text-sm leading-relaxed text-white/30">AI-powered business automation for hotels and service businesses.</p>
                <p className="mt-3 text-xs text-white/15">Varkala, Kerala, India</p>
              </div>
              <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
                <div className="space-y-2">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/20">Product</p>
                  {["Vaketta Chat","Vaketta PMS","Vaketta Flow"].map((l) => (
                    <p key={l}><a href="#product" className="text-white/35 transition hover:text-white">{l}</a></p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/20">Company</p>
                  <p><Link href="/privacy-policy" className="text-white/35 transition hover:text-white">Privacy Policy</Link></p>
                  <p><Link href="/terms" className="text-white/35 transition hover:text-white">Terms of Service</Link></p>
                  <p><Link href="/data-deletion" className="text-white/35 transition hover:text-white">Data Deletion</Link></p>
                  <p><a href="mailto:support@vaketta.com" className="text-white/35 transition hover:text-white">Support</a></p>
                  <p><Link href="/login" className="text-white/35 transition hover:text-white">Sign in</Link></p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 text-xs text-white/15 sm:flex-row">
              <p>© {new Date().getFullYear()} Vaketta. All rights reserved.</p>
              <p>Made with care in India 🇮🇳</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
