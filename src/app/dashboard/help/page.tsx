"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/lib/useMounted";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

type PolicyData = { effectiveDate: string; content: string; updatedAt: string } | null;

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How do I connect my WhatsApp Business account?",
    a: "Go to Administration → Settings → WhatsApp Integration. Enter your Meta Phone Number ID and Access Token from the Meta Developer Console. Click 'Connect via Facebook' to use the guided setup, or paste the credentials manually.",
  },
  {
    q: "How does the automated bot work?",
    a: "When a guest messages your WhatsApp number during business hours, the bot sends your configured menu. Guests select options and the bot handles replies automatically. You can customise the menu under Administration → WhatsApp Bot.",
  },
  {
    q: "How do I hand off a conversation to staff?",
    a: "Open the conversation in the Chats page and click the 'Bot ON' button to switch it off. The guest will then only receive manual replies from your team. The bot stays off until you re-enable it.",
  },
  {
    q: "How do I create a booking from a chat?",
    a: "Open the guest conversation in Chats, then click '+ Create Booking' in the top right. A booking form will appear pre-filled with the guest's details.",
  },
  {
    q: "Where do I manage room types and pricing?",
    a: "Go to Administration → Room Types. You can add rooms, set base prices, upload photos, and set capacity limits. Availability and per-date pricing is under the Availability page.",
  },
  {
    q: "Why are my messages showing as failed?",
    a: "Check that your Meta Phone Number ID and Access Token are correctly configured in Settings → WhatsApp Integration. Also ensure your Meta app is live and the phone number is verified on the Meta Business platform.",
  },
  {
    q: "How do I add or manage staff users?",
    a: "Go to Administration → User Management (ADMIN role only). You can create accounts with roles: ADMIN, MANAGER, or STAFF. Each role has different access levels.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "You will see an expiry notice on the Subscription page. Automated bot replies will stop, but you can still view conversations and manage bookings. Contact support to renew or upgrade your plan.",
  },
];

// ── Accordion item ────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E5E0D4] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-[#0C1B33] transition hover:bg-[#F4F2ED]"
      >
        <span>{q}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[#1B52A8] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm leading-relaxed text-slate-600">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Privacy policy modal ──────────────────────────────────────────────────────
function PrivacyModal({ onClose }: { onClose: () => void }) {
  const [policy,  setPolicy]  = useState<PolicyData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/privacy-policy`)
      .then((r) => r.json())
      .then((data) => { setPolicy(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D4] bg-[#0C1B33] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Vaketta Privacy Policy</h2>
            {policy?.effectiveDate && (
              <p className="mt-0.5 text-xs text-white/50">Effective Date: {policy.effectiveDate}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#E5E0D4] border-t-[#1B52A8]" />
            </div>
          ) : !policy ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Privacy policy could not be loaded. Please try again later.
            </p>
          ) : (
            <div
              className="privacy-modal-body"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between border-t border-[#E5E0D4] bg-[#F4F2ED] px-6 py-3">
          {policy?.updatedAt && (
            <p className="text-xs text-slate-400">
              Last updated: {new Date(policy.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg bg-[#0C1B33] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1B52A8]"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        .privacy-modal-body h1 { font-size: 1.4rem; font-weight: 700; margin: 1.8rem 0 0.4rem; color: #0C1B33; border-bottom: 2px solid #E5E0D4; padding-bottom: 0.35rem; }
        .privacy-modal-body h2 { font-size: 1.05rem; font-weight: 700; margin: 1.5rem 0 0.35rem; color: #0C1B33; }
        .privacy-modal-body h3 { font-size: 0.9rem; font-weight: 600; margin: 1rem 0 0.2rem; color: #1B52A8; }
        .privacy-modal-body p  { margin: 0.5rem 0; color: #374151; line-height: 1.75; font-size: 0.875rem; }
        .privacy-modal-body ul { list-style: disc; padding-left: 1.4rem; margin: 0.4rem 0; }
        .privacy-modal-body ol { list-style: decimal; padding-left: 1.4rem; margin: 0.4rem 0; }
        .privacy-modal-body li { margin: 0.25rem 0; color: #374151; line-height: 1.65; font-size: 0.875rem; }
        .privacy-modal-body strong { font-weight: 700; color: #0C1B33; }
        .privacy-modal-body em { font-style: italic; }
        .privacy-modal-body a { color: #1B52A8; text-decoration: underline; }
      `}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const mounted = useMounted();
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">

      {/* Privacy modal */}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0C1B33]">Help & Support</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find answers, get in touch, or view our policies.
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Email support */}
        <a
          href="mailto:support@vaketta.com"
          className="group flex flex-col gap-3 rounded-xl border border-[#E5E0D4] bg-white p-5 transition hover:border-[#1B52A8]/30 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B52A8]/10">
            <svg className="h-5 w-5 text-[#1B52A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0C1B33] group-hover:text-[#1B52A8] transition">Email Support</p>
            <p className="mt-0.5 text-xs text-slate-500">support@vaketta.com</p>
          </div>
        </a>

        {/* WhatsApp support */}
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-3 rounded-xl border border-[#E5E0D4] bg-white p-5 transition hover:border-green-300 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.007-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.535 5.874L.057 23.882l6.195-1.625A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.887 9.887 0 01-5.032-1.374l-.36-.214-3.733.979 1.002-3.635-.235-.374A9.867 9.867 0 012.106 12C2.106 6.577 6.577 2.106 12 2.106S21.894 6.577 21.894 12 17.423 21.894 12 21.894z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0C1B33] group-hover:text-green-700 transition">WhatsApp Support</p>
            <p className="mt-0.5 text-xs text-slate-500">Chat with our team</p>
          </div>
        </a>

        {/* Privacy policy */}
        <button
          onClick={() => setShowPrivacy(true)}
          className="group flex flex-col gap-3 rounded-xl border border-[#E5E0D4] bg-white p-5 text-left transition hover:border-[#B8912E]/40 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B8912E]/10">
            <svg className="h-5 w-5 text-[#B8912E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0C1B33] group-hover:text-[#B8912E] transition">Privacy Policy</p>
            <p className="mt-0.5 text-xs text-slate-500">How we handle your data</p>
          </div>
        </button>

      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-4 text-base font-bold text-[#0C1B33]">Frequently Asked Questions</h2>
        <div className="overflow-hidden rounded-xl border border-[#E5E0D4] bg-white">
          {FAQS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* Getting started guides */}
      <div>
        <h2 className="mb-4 text-base font-bold text-[#0C1B33]">Quick Start Guides</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: "💬", title: "Setting up WhatsApp Bot", desc: "Configure your menu, auto-replies, and business hours." },
            { icon: "📅", title: "Managing Bookings", desc: "Create, confirm, and cancel bookings from the dashboard." },
            { icon: "🏨", title: "Adding Room Types", desc: "Set up your rooms with photos, prices, and availability." },
            { icon: "👥", title: "Inviting Staff", desc: "Add team members with the right roles and permissions." },
            { icon: "🤖", title: "AI Assistant Setup", desc: "Enable AI-powered auto-replies for guest questions." },
            { icon: "📊", title: "Understanding Analytics", desc: "Track conversations, bookings, and revenue trends." },
          ].map((guide) => (
            <div
              key={guide.title}
              className="flex items-start gap-3 rounded-xl border border-[#E5E0D4] bg-white p-4"
            >
              <span className="mt-0.5 text-xl leading-none">{guide.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#0C1B33]">{guide.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{guide.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact card */}
      <div className="rounded-xl border border-[#E5E0D4] bg-[#0C1B33] p-6 text-center">
        <p className="text-sm font-semibold text-white">Still need help?</p>
        <p className="mt-1 text-xs text-white/50">
          Our support team is available Monday – Saturday, 9 AM – 6 PM IST.
        </p>
        <a
          href="mailto:support@vaketta.com"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#B8912E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a07a26]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Support
        </a>
      </div>

    </div>
  );
}
