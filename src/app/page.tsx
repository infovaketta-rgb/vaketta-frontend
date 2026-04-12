"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E0D4]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/vakettaVlogo.png" alt="Vaketta" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-[#0C1B33]">Vaketta</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {["Product", "How it works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm font-medium text-[#0C1B33]/70 transition hover:text-[#0C1B33]"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[#0C1B33]/70 transition hover:text-[#0C1B33]"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[#0C1B33] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1B52A8]"
          >
            Get started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[#E5E0D4] bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {["Product", "How it works", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-[#0C1B33]/80"
              >
                {item}
              </a>
            ))}
            <hr className="border-[#E5E0D4]" />
            <Link href="/login" className="text-sm font-medium text-[#0C1B33]/80">Sign in</Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#0C1B33] px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get started free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const timer = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(start);
        if (start >= to) clearInterval(timer);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#0C1B33] antialiased">
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0C1B33] px-6 pb-32 pt-40 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#1B52A8]/30 blur-[120px]" />
          <div className="absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-[#B8912E]/15 blur-[100px]" />
          <div className="absolute -bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-[#1B52A8]/20 blur-[100px]" />
        </div>

        {/* Badge */}
        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-[#B8912E]/30 bg-[#B8912E]/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B8912E]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#B8912E]">
            Now in early access
          </span>
        </div>

        <h1 className="relative mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
          Run your business.<br />
          <span className="bg-gradient-to-r from-[#B8912E] to-[#e4b84a] bg-clip-text text-transparent">
            Without the manual work.
          </span>
        </h1>

        <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
          Vaketta is a modular business automation platform. Automate guest communication, manage bookings, and run your operations — all from a single dashboard.
        </p>

        <div className="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-[#B8912E] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#B8912E]/30 transition hover:bg-[#a07a26] hover:shadow-[#B8912E]/40"
          >
            Start for free →
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-white/15 px-8 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            See how it works
          </a>
        </div>

        <p className="relative mt-5 text-xs text-white/30">
          No credit card required · Setup in under 10 minutes
        </p>

        {/* Stats row */}
        <div className="relative mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8">
          {[
            { label: "Messages automated daily", value: 10, suffix: "k+" },
            { label: "Hours saved per week", value: 40, suffix: "+" },
            { label: "Customer satisfaction", value: 98, suffix: "%" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/4 px-6 py-6 text-center backdrop-blur-sm">
              <div className="text-3xl font-bold text-white">
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-xs text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F2ED] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">The problem</p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Running a business is hard enough.<br />Your tools shouldn't make it harder.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Too much time on repetitive tasks",
                body: "Your team spends hours every day answering the same questions, copying data between tools, and chasing follow-ups — time that should go toward growing your business.",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Scattered tools that don't talk",
                body: "Bookings in one place, messages in another, operations in a spreadsheet. When nothing is connected, things fall through the cracks and your team wastes time context-switching.",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                ),
                title: "Growth is limited by capacity",
                body: "You can't scale without adding more staff. Every new customer or guest adds pressure. Without automation, growth means more cost, more chaos, and more burnout.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-[#E5E0D4] bg-white p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  {card.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-[#0C1B33]">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION ──────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">The solution</p>
            <h2 className="text-3xl font-bold md:text-4xl">
              One platform. Every operation.<br />Fully automated.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
              Vaketta brings your communication, bookings, and workflows into a single system that runs itself — so your team can focus on what actually matters.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Automate customer communication",
                body: "Connect WhatsApp and Instagram. Vaketta handles incoming messages, answers questions, and routes complex requests to your team — 24 hours a day.",
                color: "bg-[#1B52A8]/8 text-[#1B52A8]",
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
                  </svg>
                ),
              },
              {
                title: "Manage bookings without the chaos",
                body: "Guests can book directly through chat. Your team sees everything in one place — availability, confirmations, cancellations, and guest history.",
                color: "bg-emerald-50 text-emerald-600",
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: "Build workflows without code",
                body: "Design multi-step conversation flows using a visual editor. No developers needed. Deploy in minutes and change them any time.",
                color: "bg-[#B8912E]/10 text-[#B8912E]",
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: "See everything in real time",
                body: "Live dashboards show conversations, bookings, revenue, and team activity. No more end-of-day reports — make decisions with data that's always current.",
                color: "bg-purple-50 text-purple-600",
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
            ].map((card) => (
              <div key={card.title} className="flex gap-4 rounded-2xl border border-[#E5E0D4] p-6">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="mb-1.5 font-bold text-[#0C1B33]">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT MODULES ───────────────────────────────────────────────── */}
      <section id="product" className="bg-[#0C1B33] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Products</p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Start with what you need.<br />Expand when you're ready.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
              Vaketta is modular. Each product works independently and becomes more powerful when combined.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Vaketta Chat",
                tag: "Communication",
                tagColor: "text-[#1B52A8] bg-[#1B52A8]/15",
                description: "Automate guest and customer conversations on WhatsApp and Instagram. Your AI handles common questions around the clock — your team steps in when it matters.",
                features: ["WhatsApp & Instagram", "AI-powered replies", "Live handoff to staff", "Message history"],
                icon: "💬",
              },
              {
                name: "Vaketta PMS",
                tag: "Property Management",
                tagColor: "text-[#B8912E] bg-[#B8912E]/15",
                description: "A property management system built for hotels and guesthouses. Manage rooms, bookings, and guests from one clean dashboard without the enterprise price tag.",
                features: ["Booking management", "Room types & availability", "Guest records", "Revenue analytics"],
                icon: "🏨",
                featured: true,
              },
              {
                name: "Vaketta Flow",
                tag: "Workflow Builder",
                tagColor: "text-emerald-400 bg-emerald-400/15",
                description: "Build automated conversation flows using a visual drag-and-drop editor. No code required. Deploy, test, and update flows in real time.",
                features: ["Visual flow editor", "Conditional logic", "Form collection", "Action triggers"],
                icon: "🔀",
              },
            ].map((product) => (
              <div
                key={product.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  product.featured
                    ? "border-[#B8912E]/40 bg-[#B8912E]/5"
                    : "border-white/10 bg-white/4"
                }`}
              >
                {product.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B8912E] px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Most popular
                  </div>
                )}
                <div className="mb-4 text-3xl">{product.icon}</div>
                <span className={`mb-3 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${product.tagColor}`}>
                  {product.tag}
                </span>
                <h3 className="mb-2 text-lg font-bold text-white">{product.name}</h3>
                <p className="mb-5 text-sm leading-relaxed text-white/50">{product.description}</p>
                <ul className="mt-auto space-y-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
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

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">How it works</p>
            <h2 className="text-3xl font-bold md:text-4xl">
              Up and running in three steps.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
              No implementation consultant. No six-month rollout. Just connect, configure, and go.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-7 top-8 hidden h-[calc(100%-64px)] w-px bg-gradient-to-b from-[#1B52A8] via-[#B8912E] to-transparent md:left-1/2 md:block" />

            <div className="space-y-10">
              {[
                {
                  step: "01",
                  title: "Connect your channels",
                  body: "Link your WhatsApp Business account and Instagram in minutes. We guide you through every step — no developer needed.",
                  align: "left",
                },
                {
                  step: "02",
                  title: "Set up your automation",
                  body: "Configure your menu, build conversation flows, and define how your team handles escalations. Start with templates or build from scratch.",
                  align: "right",
                },
                {
                  step: "03",
                  title: "Watch it run itself",
                  body: "Vaketta handles incoming messages, qualifies leads, processes bookings, and updates your dashboard — all automatically, around the clock.",
                  align: "left",
                },
              ].map((step, i) => (
                <div
                  key={step.step}
                  className={`flex items-start gap-6 md:gap-12 ${
                    step.align === "right" ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0C1B33] text-lg font-bold text-[#B8912E] shadow-lg">
                    {step.step}
                  </div>
                  <div className={`flex-1 rounded-2xl border border-[#E5E0D4] bg-[#F4F2ED] p-6 ${step.align === "right" ? "md:text-right" : ""}`}>
                    <h3 className="mb-2 text-lg font-bold text-[#0C1B33]">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ──────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F2ED] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Benefits</p>
            <h2 className="text-3xl font-bold md:text-4xl">
              The impact from day one.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                metric: "70%",
                title: "Fewer repetitive messages",
                body: "Vaketta handles FAQs, booking enquiries, and status updates automatically — your team only handles what needs a human.",
              },
              {
                metric: "3×",
                title: "Faster response times",
                body: "Guests and customers get instant replies at any hour. No more waiting until the next business day for a simple answer.",
              },
              {
                metric: "∞",
                title: "Scale without more headcount",
                body: "Automation doesn't get tired. Handle 10 conversations or 10,000 — the system performs exactly the same.",
              },
              {
                metric: "100%",
                title: "Full conversation history",
                body: "Every message, booking, and interaction is stored and searchable. Your team always has the context they need.",
              },
              {
                metric: "24/7",
                title: "Always available",
                body: "Your business runs outside office hours. Vaketta makes sure guests can get help and make bookings even when your team is offline.",
              },
              {
                metric: "< 10m",
                title: "Setup time",
                body: "Connect your WhatsApp account, configure your first flow, and start handling real conversations in under 10 minutes.",
              },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-[#E5E0D4] bg-white p-6">
                <div className="mb-3 text-3xl font-bold text-[#1B52A8]">{b.metric}</div>
                <h3 className="mb-1.5 font-bold text-[#0C1B33]">{b.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">What people say</p>
            <h2 className="text-3xl font-bold">Trusted by operators who care about efficiency.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "We used to miss WhatsApp messages all the time. Now Vaketta replies instantly, and our team only steps in for actual bookings. Guest satisfaction is up noticeably.",
                name: "Priya M.",
                role: "Owner, boutique guesthouse · Goa",
              },
              {
                quote: "The booking flow alone saves us two hours every day. Guests check availability, pick a room, and confirm — all through WhatsApp without our staff lifting a finger.",
                name: "Arjun K.",
                role: "Operations Manager · Munnar Hill Resort",
              },
              {
                quote: "I was sceptical about automation, but the setup was so simple. We were live in one afternoon. It genuinely feels like we hired an extra team member.",
                name: "Fatima R.",
                role: "Director · Varkala Beach Hotel",
              },
            ].map((t) => (
              <div key={t.name} className="flex flex-col rounded-2xl border border-[#E5E0D4] bg-[#F4F2ED] p-6">
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-[#B8912E]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-600 italic">"{t.quote}"</p>
                <div className="mt-5 border-t border-[#E5E0D4] pt-4">
                  <p className="text-sm font-bold text-[#0C1B33]">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING HINT ──────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#F4F2ED] px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Pricing</p>
          <h2 className="text-3xl font-bold md:text-4xl">
            Simple pricing. No surprises.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
            Start with a free trial. Upgrade when you're ready. Every plan includes all core features — you only pay more when you grow.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { name: "Trial", price: "Free", period: "14 days", features: ["500 conversations", "200 AI replies", "All modules included"], cta: "Start free trial" },
              { name: "Starter", price: "₹2,499", period: "per month", features: ["2,000 conversations", "1,000 AI replies", "Priority support"], cta: "Get started", featured: true },
              { name: "Growth", price: "₹5,999", period: "per month", features: ["Unlimited conversations", "Unlimited AI replies", "Dedicated support"], cta: "Get started" },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 text-left ${
                  plan.featured
                    ? "border-[#1B52A8] bg-[#0C1B33] text-white shadow-xl"
                    : "border-[#E5E0D4] bg-white"
                }`}
              >
                <p className={`mb-1 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-[#B8912E]" : "text-slate-400"}`}>{plan.name}</p>
                <div className="mb-1 flex items-end gap-1">
                  <span className={`text-3xl font-bold ${plan.featured ? "text-white" : "text-[#0C1B33]"}`}>{plan.price}</span>
                </div>
                <p className={`mb-5 text-xs ${plan.featured ? "text-white/40" : "text-slate-400"}`}>{plan.period}</p>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-white/70" : "text-slate-600"}`}>
                      <svg className={`h-3.5 w-3.5 shrink-0 ${plan.featured ? "text-[#B8912E]" : "text-[#1B52A8]"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-[#B8912E] text-white hover:bg-[#a07a26]"
                      : "border border-[#E5E0D4] bg-[#F4F2ED] text-[#0C1B33] hover:bg-[#E5E0D4]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0C1B33] px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1B52A8]/25 blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px] translate-y-1/2 rounded-full bg-[#B8912E]/15 blur-[80px]" />
        </div>

        <div className="relative">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#B8912E]">Get started today</p>
          <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
            Your business deserves to run better.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/50">
            Join hundreds of hotels and businesses already using Vaketta to automate operations and serve customers better.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-[#B8912E] px-10 py-4 text-sm font-bold text-white shadow-lg shadow-[#B8912E]/30 transition hover:bg-[#a07a26]"
            >
              Start your free trial →
            </Link>
            <a
              href="mailto:support@vaketta.com"
              className="rounded-xl border border-white/15 px-10 py-4 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Talk to us
            </a>
          </div>
          <p className="mt-5 text-xs text-white/25">No credit card required · Cancel anytime · Setup in minutes</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E0D4] bg-white px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="mb-3 flex items-center gap-2.5">
                <img src="/vakettaVlogo.png" alt="Vaketta" className="h-7 w-7 object-contain" />
                <span className="text-base font-bold text-[#0C1B33]">Vaketta</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                AI-powered business automation for hotels and service businesses.
              </p>
              <p className="mt-3 text-xs text-slate-300">Varkala, Kerala, India</p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
              <div className="space-y-2">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-300">Product</p>
                {["Vaketta Chat", "Vaketta PMS", "Vaketta Flow"].map((l) => (
                  <p key={l}><a href="#product" className="text-slate-500 transition hover:text-[#0C1B33]">{l}</a></p>
                ))}
              </div>
              <div className="space-y-2">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-300">Company</p>
                <p><Link href="/privacy-policy" className="text-slate-500 transition hover:text-[#0C1B33]">Privacy Policy</Link></p>
                <p><a href="mailto:support@vaketta.com" className="text-slate-500 transition hover:text-[#0C1B33]">Support</a></p>
                <p><Link href="/login" className="text-slate-500 transition hover:text-[#0C1B33]">Sign in</Link></p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#E5E0D4] pt-6 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} Vaketta. All rights reserved.</p>
            <p>Made with care in India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
