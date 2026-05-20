"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ── CSS injected once ─────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
@keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
@keyframes ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
@keyframes floatN { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
.anim-fadeUp { animation: fadeUp .6s ease both; }
.anim-floatN { animation: floatN 5s ease-in-out infinite; }
.reveal      { opacity:0; transform:translateY(24px); transition: opacity .5s ease, transform .5s ease; }
.reveal.in   { opacity:1; transform:none; }

/* Brutalist hard-shadow blocks */
.brutal       { box-shadow: 6px 6px 0 0 #0C1B33; transition: transform .12s ease, box-shadow .12s ease; }
.brutal:hover { transform: translate(3px,3px); box-shadow: 3px 3px 0 0 #0C1B33; }
.brutal-v       { box-shadow: 6px 6px 0 0 #7C3AED; transition: transform .12s ease, box-shadow .12s ease; }
.brutal-v:hover { transform: translate(3px,3px); box-shadow: 3px 3px 0 0 #7C3AED; }
.brutal-sm    { box-shadow: 4px 4px 0 0 #0C1B33; }

@media (prefers-reduced-motion: reduce) {
  .anim-fadeUp,.anim-floatN { animation: none !important; }
  .reveal { opacity:1 !important; transform:none !important; transition:none; }
  .brutal:hover,.brutal-v:hover { transform:none; box-shadow: 6px 6px 0 0 #0C1B33; }
}
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
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-[3px] border-[#0C1B33] bg-[#F4F2ED]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center border-[2.5px] border-[#0C1B33] bg-white">
            <img src="/vakettaVlogo.png" alt="Vaketta" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight text-[#0C1B33]">Vaketta</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {["Product","How it works","Pricing"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g,"-")}`}
              className="text-sm font-bold uppercase tracking-wide text-[#0C1B33] transition hover:text-[#7C3AED]">
              {item}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-bold uppercase tracking-wide text-[#0C1B33] hover:text-[#7C3AED] transition">Sign in</Link>
          <Link href="/get-started"
            className="brutal-sm border-[2.5px] border-[#0C1B33] bg-[#8B5CF6] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#0C1B33] transition hover:bg-[#A78BFA]">
            Get started
          </Link>
        </div>
        <button onClick={() => setOpen(v => !v)} aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center border-[2.5px] border-[#0C1B33] bg-white text-[#0C1B33] md:hidden">
          {open
            ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>
      {open && (
        <div className="border-t-[3px] border-[#0C1B33] bg-[#F4F2ED] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {["Product","How it works","Pricing"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g,"-")}`} onClick={() => setOpen(false)}
                className="text-sm font-bold uppercase tracking-wide text-[#0C1B33]">{item}</a>
            ))}
            <hr className="border-[#0C1B33]/20" />
            <Link href="/login" className="text-sm font-bold uppercase text-[#0C1B33]">Sign in</Link>
            <Link href="/get-started" className="brutal-sm border-[2.5px] border-[#0C1B33] bg-[#8B5CF6] px-4 py-2.5 text-center text-sm font-black uppercase text-[#0C1B33]">Get started free</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Dashboard mockup (bordered window) ─────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="brutal border-[3px] border-[#0C1B33] bg-white">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b-[3px] border-[#0C1B33] bg-[#8B5CF6] px-4 py-2.5">
          <div className="h-3 w-3 rounded-full border-2 border-[#0C1B33] bg-white" />
          <div className="h-3 w-3 rounded-full border-2 border-[#0C1B33] bg-white" />
          <div className="h-3 w-3 rounded-full border-2 border-[#0C1B33] bg-white" />
          <span className="ml-3 text-xs font-black uppercase tracking-wide text-[#0C1B33]">Vaketta — Dashboard</span>
        </div>
        <div className="p-4 space-y-3">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Messages today", val: "1,284" },
              { label: "Active bookings", val: "47" },
              { label: "Revenue MTD", val: "₹2.4L" },
            ].map((s) => (
              <div key={s.label} className="border-[2.5px] border-[#0C1B33] bg-[#F4F2ED] p-3">
                <p className="text-lg font-black tabular-nums text-[#0C1B33]">{s.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-tight text-[#0C1B33]/55 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="border-[2.5px] border-[#0C1B33] bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0C1B33] mb-2">Revenue — last 7 days</p>
            <div className="flex items-end gap-1.5 h-14">
              {[40,65,50,80,60,90,75].map((h, i) => (
                <div key={i} className="flex-1 border-2 border-[#0C1B33] bg-[#8B5CF6]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          {/* Messages */}
          <div className="space-y-2">
            {[
              { name: "Anjali S.", msg: "What time is check-out?", status: "auto-replied", fill: "bg-emerald-300" },
              { name: "Rohan M.", msg: "I'd like to book a room…", status: "pending", fill: "bg-yellow-300" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2.5 border-[2.5px] border-[#0C1B33] bg-white px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center border-2 border-[#0C1B33] bg-[#A78BFA] text-xs font-black text-[#0C1B33]">{m.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#0C1B33]">{m.name}</p>
                  <p className="text-[10px] text-[#0C1B33]/55 truncate">{m.msg}</p>
                </div>
                <span className={`border-2 border-[#0C1B33] ${m.fill} px-1.5 py-0.5 text-[9px] font-black uppercase text-[#0C1B33]`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating note */}
      <div className="anim-floatN absolute -top-5 -right-6 hidden border-[3px] border-[#0C1B33] bg-emerald-300 px-3 py-2 sm:block brutal-sm">
        <p className="text-[10px] font-black uppercase text-[#0C1B33]">✓ Booking confirmed</p>
        <p className="text-[9px] font-bold text-[#0C1B33]/70">Room 204 · 3 nights</p>
      </div>
      {/* Floating AI badge */}
      <div className="absolute -bottom-4 -left-5 hidden border-[3px] border-[#0C1B33] bg-[#8B5CF6] px-3 py-2 sm:block brutal-sm">
        <p className="text-[10px] font-black uppercase text-[#0C1B33]">AI replied · 0.3s</p>
      </div>
    </div>
  );
}

// ── Section label chip ─────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block border-[2.5px] border-[#0C1B33] bg-[#8B5CF6] px-3 py-1 text-xs font-black uppercase tracking-widest text-[#0C1B33] brutal-sm">
      {children}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useReveal();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <div className="min-h-screen bg-[#F4F2ED] font-sans text-[#0C1B33] antialiased overflow-x-hidden">
        <Nav />

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section className="relative px-5 pt-28 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="anim-fadeUp"><Eyebrow>Now in early access</Eyebrow></div>
                <h1 className="anim-fadeUp mt-6 text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl lg:text-7xl" style={{ animationDelay: ".05s" }}>
                  Run your<br />hotel.<br />
                  <span className="mt-2 inline-block border-[3px] border-[#0C1B33] bg-[#8B5CF6] px-3 py-1 brutal">Without<br />the chaos.</span>
                </h1>
                <p className="anim-fadeUp mt-7 max-w-md text-lg font-medium leading-relaxed text-[#0C1B33]/75" style={{ animationDelay: ".15s" }}>
                  Vaketta automates guest communication, bookings, and operations — all from one dashboard. Powered by WhatsApp AI.
                </p>
                <div className="anim-fadeUp mt-8 flex flex-col gap-4 sm:flex-row" style={{ animationDelay: ".25s" }}>
                  <Link href="/get-started"
                    className="brutal inline-flex items-center justify-center gap-2 border-[3px] border-[#0C1B33] bg-[#8B5CF6] px-8 py-4 text-sm font-black uppercase tracking-wide text-[#0C1B33] hover:bg-[#A78BFA]">
                    Start for free
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                  <a href="#how-it-works"
                    className="brutal inline-flex items-center justify-center border-[3px] border-[#0C1B33] bg-white px-8 py-4 text-sm font-black uppercase tracking-wide text-[#0C1B33] hover:bg-[#F4F2ED]">
                    See how it works
                  </a>
                </div>
                <p className="anim-fadeUp mt-5 text-xs font-bold uppercase tracking-wide text-[#0C1B33]/50" style={{ animationDelay: ".35s" }}>
                  No credit card · Setup in under 10 minutes
                </p>
              </div>
              <div className="anim-fadeUp hidden lg:block" style={{ animationDelay: ".2s" }}>
                <DashboardMockup />
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-20 grid grid-cols-1 border-[3px] border-[#0C1B33] bg-white sm:grid-cols-3 brutal">
              {[
                { label: "Messages automated daily", value: 10, suffix: "k+" },
                { label: "Hours saved per week", value: 40, suffix: "+" },
                { label: "Customer satisfaction", value: 98, suffix: "%" },
              ].map((s, i) => (
                <div key={s.label} className={`px-6 py-7 text-center ${i < 2 ? "border-b-[3px] border-[#0C1B33] sm:border-b-0 sm:border-r-[3px]" : ""}`}>
                  <div className="text-4xl font-black tabular-nums text-[#0C1B33]"><Counter to={s.value} suffix={s.suffix} /></div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#0C1B33]/55">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TICKER ──────────────────────────────────────────────────────── */}
        <div className="border-y-[3px] border-[#0C1B33] bg-[#0C1B33] py-3 overflow-hidden">
          <div className="flex whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
            {[...Array(2)].map((_, k) => (
              <div key={k} className="flex items-center gap-8 px-4">
                {["WhatsApp Automation","AI-Powered Replies","Booking Management","Live Dashboard","Guest Communication","Revenue Analytics","Custom Flows","24/7 Operations"].map((t) => (
                  <span key={t} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white">
                    <span className="h-2 w-2 bg-[#8B5CF6]" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── PROBLEM ─────────────────────────────────────────────────────── */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-12 text-center">
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase leading-tight md:text-4xl">
                Running a hotel is hard enough.<br />Your tools shouldn't make it harder.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: "⏰", title: "Too much time on repetitive tasks", body: "Your team spends hours every day answering the same questions, copying data, and chasing follow-ups." },
                { icon: "🔀", title: "Scattered tools that don't talk", body: "Bookings in one place, messages in another, ops in a spreadsheet. Things fall through the cracks." },
                { icon: "📉", title: "Growth is limited by capacity", body: "You can't scale without adding more staff. Every new guest adds pressure without automation." },
              ].map((c) => (
                <div key={c.title} className="reveal brutal border-[3px] border-[#0C1B33] bg-white p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center border-[2.5px] border-[#0C1B33] bg-red-300 text-2xl">{c.icon}</div>
                  <h3 className="mb-2 font-black uppercase text-[#0C1B33]">{c.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-[#0C1B33]/70">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <section className="border-y-[3px] border-[#0C1B33] bg-[#8B5CF6] px-5 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-12 text-center">
              <span className="inline-block border-[2.5px] border-[#0C1B33] bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-[#0C1B33] brutal-sm">The solution</span>
              <h2 className="mt-5 text-3xl font-black uppercase leading-tight text-[#0C1B33] md:text-4xl">
                One platform. Every operation.<br />Fully automated.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { icon: "💬", title: "Automate guest communication", body: "Connect WhatsApp. Vaketta handles incoming messages, answers questions, and routes complex requests to your team — 24 hours a day." },
                { icon: "📅", title: "Manage bookings without the chaos", body: "Guests book directly through chat. Your team sees availability, confirmations, cancellations, and guest history in one place." },
                { icon: "⚡", title: "Build workflows without code", body: "Design multi-step conversation flows using a visual editor. No developers needed. Deploy in minutes, change any time." },
                { icon: "📊", title: "See everything in real time", body: "Live dashboards show conversations, bookings, revenue, and team activity. Make decisions with data that's always current." },
              ].map((c) => (
                <div key={c.title} className="reveal brutal border-[3px] border-[#0C1B33] bg-white p-6">
                  <div className="mb-4 text-3xl">{c.icon}</div>
                  <h3 className="mb-2 font-black uppercase text-[#0C1B33] text-lg">{c.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-[#0C1B33]/70">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT MODULES ─────────────────────────────────────────────── */}
        <section id="product" className="px-5 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-12 text-center">
              <Eyebrow>Products</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase leading-tight md:text-4xl">
                Start with what you need.<br />Expand when you're ready.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { name: "Vaketta Chat", tag: "Communication", desc: "Automate guest conversations on WhatsApp. AI handles questions around the clock — your team steps in when it matters.", features: ["WhatsApp & Instagram","AI-powered replies","Live handoff","Message history"], icon: "💬", fill: "bg-white", featured: false },
                { name: "Vaketta PMS", tag: "Property Management", desc: "A property management system built for hotels. Manage rooms, bookings, and guests from one clean dashboard.", features: ["Booking management","Room availability","Guest records","Revenue analytics"], icon: "🏨", fill: "bg-[#A78BFA]", featured: true },
                { name: "Vaketta Flow", tag: "Workflow Builder", desc: "Build automated conversation flows using a visual drag-and-drop editor. No code required.", features: ["Visual flow editor","Conditional logic","Form collection","Action triggers"], icon: "🔀", fill: "bg-white", featured: false },
              ].map((p) => (
                <div key={p.name} className={`reveal brutal relative flex flex-col border-[3px] border-[#0C1B33] ${p.fill} p-6`}>
                  {p.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 border-[2.5px] border-[#0C1B33] bg-[#0C1B33] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">Most popular</div>
                  )}
                  <div className="mb-4 text-4xl">{p.icon}</div>
                  <span className="mb-3 w-fit border-2 border-[#0C1B33] bg-[#F4F2ED] px-2.5 py-0.5 text-[11px] font-black uppercase text-[#0C1B33]">{p.tag}</span>
                  <h3 className="mb-2 text-lg font-black uppercase text-[#0C1B33]">{p.name}</h3>
                  <p className="mb-5 text-sm font-medium leading-relaxed text-[#0C1B33]/70">{p.desc}</p>
                  <ul className="mt-auto space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm font-bold text-[#0C1B33]">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center border-2 border-[#0C1B33] bg-[#8B5CF6] text-[9px]">✓</span>
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
        <section id="how-it-works" className="border-y-[3px] border-[#0C1B33] bg-white px-5 py-24">
          <div className="mx-auto max-w-4xl">
            <div className="reveal mb-12 text-center">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase md:text-4xl">Up and running in three steps.</h2>
            </div>
            <div className="space-y-6">
              {[
                { step: "01", title: "Submit your details", body: "Fill out a quick form. Tell us about your property and choose a plan. Our team verifies and creates your account." },
                { step: "02", title: "Connect WhatsApp", body: "Link your WhatsApp Business account. We guide you through every step — no developer needed." },
                { step: "03", title: "Watch it run itself", body: "Vaketta handles messages, qualifies leads, processes bookings, and updates your dashboard automatically." },
              ].map((s) => (
                <div key={s.step} className="reveal flex items-stretch gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center border-[3px] border-[#0C1B33] bg-[#8B5CF6] text-2xl font-black text-[#0C1B33] brutal-sm">{s.step}</div>
                  <div className="brutal flex-1 border-[3px] border-[#0C1B33] bg-[#F4F2ED] p-5">
                    <h3 className="mb-1.5 text-lg font-black uppercase text-[#0C1B33]">{s.title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-[#0C1B33]/70">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENEFITS ────────────────────────────────────────────────────── */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-12 text-center">
              <Eyebrow>Benefits</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase md:text-4xl">The impact from day one.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { metric: "70%", title: "Fewer repetitive messages", body: "Vaketta handles FAQs, booking enquiries, and status updates automatically." },
                { metric: "3×",  title: "Faster response times", body: "Guests get instant replies at any hour — no more waiting until next business day." },
                { metric: "∞",   title: "Scale without headcount", body: "Handle 10 conversations or 10,000. The system performs exactly the same." },
                { metric: "100%",title: "Full conversation history", body: "Every message, booking, and interaction stored and searchable." },
                { metric: "24/7",title: "Always available", body: "Guests can get help and make bookings even when your team is offline." },
                { metric: "<10m",title: "Setup time", body: "Connect WhatsApp, configure your first flow, and go live in under 10 minutes." },
              ].map((b) => (
                <div key={b.title} className="reveal brutal border-[3px] border-[#0C1B33] bg-white p-6">
                  <div className="mb-3 inline-block border-[2.5px] border-[#0C1B33] bg-[#8B5CF6] px-3 py-1 text-3xl font-black text-[#0C1B33]">{b.metric}</div>
                  <h3 className="mb-1.5 font-black uppercase text-[#0C1B33]">{b.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-[#0C1B33]/70">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
        <section className="border-y-[3px] border-[#0C1B33] bg-[#A78BFA] px-5 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="reveal mb-12 text-center">
              <span className="inline-block border-[2.5px] border-[#0C1B33] bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-[#0C1B33] brutal-sm">What people say</span>
              <h2 className="mt-5 text-3xl font-black uppercase text-[#0C1B33]">Trusted by operators who care.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { quote: "We used to miss WhatsApp messages all the time. Now Vaketta replies instantly. Guest satisfaction is up noticeably.", name: "Priya M.", role: "Owner, boutique guesthouse · Goa" },
                { quote: "The booking flow alone saves us two hours every day. Guests confirm through WhatsApp without our staff lifting a finger.", name: "Arjun K.", role: "Operations Manager · Munnar Hill Resort" },
                { quote: "I was sceptical about automation, but the setup was so simple. It genuinely feels like we hired an extra team member.", name: "Fatima R.", role: "Director · Varkala Beach Hotel" },
              ].map((t) => (
                <div key={t.name} className="reveal brutal flex flex-col border-[3px] border-[#0C1B33] bg-white p-6">
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="h-4 w-4 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm font-medium leading-relaxed text-[#0C1B33]/80">"{t.quote}"</p>
                  <div className="mt-5 border-t-[2.5px] border-[#0C1B33] pt-4">
                    <p className="text-sm font-black uppercase text-[#0C1B33]">{t.name}</p>
                    <p className="text-xs font-bold text-[#0C1B33]/55">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────────────── */}
        <section id="pricing" className="px-5 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="reveal">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-5 text-3xl font-black uppercase md:text-4xl">Simple pricing. No surprises.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base font-medium text-[#0C1B33]/70">
                Start with a free trial. Upgrade when you're ready. Every plan includes all core features.
              </p>
            </div>
            <div className="reveal mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { name: "Trial", price: "Free", period: "14 days", features: ["500 conversations","200 AI replies","All modules included"], cta: "Start free trial", featured: false },
                { name: "Starter", price: "₹2,499", period: "per month", features: ["2,000 conversations","1,000 AI replies","Priority support"], cta: "Get started", featured: true },
                { name: "Growth", price: "₹5,999", period: "per month", features: ["Unlimited conversations","Unlimited AI replies","Dedicated support"], cta: "Get started", featured: false },
              ].map((plan) => (
                <div key={plan.name} className={`brutal relative border-[3px] border-[#0C1B33] p-6 text-left ${plan.featured ? "bg-[#8B5CF6]" : "bg-white"}`}>
                  {plan.featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 border-[2.5px] border-[#0C1B33] bg-[#0C1B33] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">Best value</div>}
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#0C1B33]">{plan.name}</p>
                  <div className="mb-1"><span className="text-4xl font-black text-[#0C1B33]">{plan.price}</span></div>
                  <p className="mb-5 text-xs font-bold uppercase text-[#0C1B33]/60">{plan.period}</p>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm font-bold text-[#0C1B33]">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center border-2 border-[#0C1B33] bg-white text-[9px]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/get-started"
                    className={`block border-[2.5px] border-[#0C1B33] py-2.5 text-center text-sm font-black uppercase tracking-wide text-[#0C1B33] transition brutal-sm ${plan.featured ? "bg-white hover:bg-[#F4F2ED]" : "bg-[#8B5CF6] hover:bg-[#A78BFA]"}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <section className="border-t-[3px] border-[#0C1B33] bg-[#0C1B33] px-5 py-28 text-center">
          <div className="reveal mx-auto max-w-3xl">
            <span className="inline-block border-[2.5px] border-[#8B5CF6] bg-[#8B5CF6] px-3 py-1 text-xs font-black uppercase tracking-widest text-[#0C1B33]">Get started today</span>
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black uppercase leading-tight text-white md:text-5xl">
              Your hotel deserves<br />to run better.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-white/70">
              Join hotels already using Vaketta to automate operations and serve guests better.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/get-started"
                className="inline-flex items-center gap-2 border-[3px] border-white bg-[#8B5CF6] px-10 py-4 text-sm font-black uppercase tracking-wide text-[#0C1B33] transition hover:bg-[#A78BFA]"
                style={{ boxShadow: "6px 6px 0 0 #8B5CF6" }}>
                Start your free trial
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="mailto:support@vaketta.com"
                className="border-[3px] border-white bg-transparent px-10 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#0C1B33]">
                Talk to us
              </a>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-white/40">No credit card · Cancel anytime · Setup in minutes</p>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer className="border-t-[3px] border-[#8B5CF6] bg-[#0C1B33] px-5 py-14">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
              <div className="max-w-xs">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center border-2 border-white bg-white"><img src="/vakettaVlogo.png" alt="Vaketta" className="h-6 w-6 object-contain" /></div>
                  <span className="text-base font-black uppercase text-white">Vaketta</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-white/50">AI-powered business automation for hotels and service businesses.</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-white/30">Varkala, Kerala, India</p>
              </div>
              <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
                <div className="space-y-2">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#8B5CF6]">Product</p>
                  {["Vaketta Chat","Vaketta PMS","Vaketta Flow"].map((l) => (
                    <p key={l}><a href="#product" className="font-bold text-white/55 transition hover:text-white">{l}</a></p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#8B5CF6]">Company</p>
                  <p><Link href="/privacy-policy" className="font-bold text-white/55 transition hover:text-white">Privacy Policy</Link></p>
                  <p><Link href="/terms" className="font-bold text-white/55 transition hover:text-white">Terms of Service</Link></p>
                  <p><Link href="/data-deletion" className="font-bold text-white/55 transition hover:text-white">Data Deletion</Link></p>
                  <p><a href="mailto:support@vaketta.com" className="font-bold text-white/55 transition hover:text-white">Support</a></p>
                  <p><Link href="/login" className="font-bold text-white/55 transition hover:text-white">Sign in</Link></p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t-2 border-white/15 pt-6 text-xs font-bold uppercase tracking-wide text-white/30 sm:flex-row">
              <p>© {new Date().getFullYear()} Vaketta. All rights reserved.</p>
              <p>Made with care in India</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
