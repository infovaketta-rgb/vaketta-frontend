"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Policy = {
  effectiveDate: string;
  content:       string;
  updatedAt:     string;
};

export default function PrivacyPolicyPage() {
  const [policy,  setPolicy]  = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/privacy-policy`, { headers: { ...(process.env.NODE_ENV === "development" ? { "ngrok-skip-browser-warning": "true" } : {}) } })
      .then((r) => r.json())
      .then((data) => { setPolicy(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F2ED]">

      {/* Top bar */}
      <header className="border-b border-[#E5E0D4] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/vakettaVlogo.png" alt="Vaketta" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-[#0C1B33]">Vaketta</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-[#E5E0D4] bg-white px-4 py-1.5 text-sm text-[#0C1B33] transition hover:bg-[#F4F2ED]"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E0D4] border-t-[#1B52A8]" />
          </div>
        ) : !policy ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
            Privacy policy could not be loaded. Please try again later.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E5E0D4] bg-white shadow-sm">

            {/* Hero header */}
            <div className="border-b border-[#E5E0D4] bg-[#0C1B33] px-10 py-10 text-center">
              <img src="/vakettaVlogo.png" alt="Vaketta" className="mx-auto mb-3 h-12 w-12 object-contain" />
              <h1 className="text-3xl font-bold text-white">VAKETTA</h1>
              <p className="mt-1 text-lg font-medium text-[#B8912E]">Privacy Policy</p>
              {policy.effectiveDate && (
                <p className="mt-2 text-sm text-white/50">
                  Effective Date: {policy.effectiveDate}
                </p>
              )}
            </div>

            {/* Intro blurb */}
            <div className="border-b border-[#E5E0D4] bg-[#F4F2ED] px-10 py-6 text-sm text-[#0C1B33]/70 leading-relaxed">
              Vaketta ("we", "our", or "us") is committed to protecting the privacy of hotel operators, their staff, and their guests who interact with our platform. This Privacy Policy explains how we collect, use, store, and share information when you use Vaketta — our AI-powered hotel communication and booking automation platform.
              <br /><br />
              By using Vaketta, you agree to the practices described in this policy.
            </div>

            {/* Policy body */}
            <div
              className="privacy-body px-10 py-8"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />

            {/* Footer */}
            <div className="border-t border-[#E5E0D4] bg-[#F4F2ED] px-10 py-5 text-center text-xs text-[#0C1B33]/40">
              © {new Date().getFullYear()} Vaketta. All rights reserved.
              {policy.updatedAt && (
                <span className="ml-3">
                  Last updated: {new Date(policy.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Styles for rendered HTML */}
      <style>{`
        .privacy-body h1 { font-size: 1.6rem; font-weight: 700; margin: 2rem 0 0.5rem; color: #0C1B33; border-bottom: 2px solid #E5E0D4; padding-bottom: 0.4rem; }
        .privacy-body h2 { font-size: 1.2rem; font-weight: 700; margin: 2rem 0 0.5rem; color: #0C1B33; }
        .privacy-body h3 { font-size: 1rem; font-weight: 600; margin: 1.2rem 0 0.3rem; color: #1B52A8; }
        .privacy-body p  { margin: 0.6rem 0; color: #2d3748; line-height: 1.75; font-size: 0.95rem; }
        .privacy-body ul { list-style: disc; padding-left: 1.6rem; margin: 0.5rem 0 0.5rem; }
        .privacy-body ol { list-style: decimal; padding-left: 1.6rem; margin: 0.5rem 0; }
        .privacy-body li { margin: 0.3rem 0; color: #2d3748; line-height: 1.6; font-size: 0.95rem; }
        .privacy-body strong { font-weight: 700; color: #0C1B33; }
        .privacy-body em { font-style: italic; }
        .privacy-body a { color: #1B52A8; text-decoration: underline; }
        .privacy-body br { display: block; content: ""; margin: 0.2rem 0; }
      `}</style>
    </div>
  );
}
