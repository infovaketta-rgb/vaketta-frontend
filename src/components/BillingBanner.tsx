"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { statusMeta, normalizeStatus, daysUntil } from "@/lib/subscriptionStatus";

/**
 * Dashboard-wide billing notice.
 *
 * WHY THIS EXISTS: there was no subscription warning anywhere in the hotel
 * panel. A trial simply ended one morning and the bot stopped answering guests,
 * with the first sign of trouble being a support ticket. The only billing signal
 * in the whole product was a 402 that redirected to a page which was itself 402'd.
 *
 * Renders nothing on the happy path (ACTIVE, or a trial with more than a week
 * left) so it never becomes chrome people learn to ignore.
 */

type Notice = {
  tone: "info" | "warning" | "danger";
  message: string;
  cta: string;
};

/** Days of trial remaining at which we start nagging. */
const TRIAL_WARN_DAYS = 7;

function buildNotice(status: string | null, billingEndDate: string | null): Notice | null {
  const normalized = normalizeStatus(status);
  if (!normalized) return null;

  const meta = statusMeta(normalized);

  if (meta.suspended) {
    return { tone: "danger", message: meta.description, cta: "View plans" };
  }

  if (normalized === "PAST_DUE") {
    return { tone: "warning", message: meta.description, cta: "View invoices" };
  }

  if (normalized === "TRIALING") {
    const left = daysUntil(billingEndDate);
    if (left === null || left > TRIAL_WARN_DAYS) return null;
    const when = left <= 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
    return {
      tone: left <= 2 ? "warning" : "info",
      message: `Your free trial ends ${when}. Choose a plan to keep automated replies running.`,
      cta: "View plans",
    };
  }

  return null;
}

const TONE_CLASSES: Record<Notice["tone"], string> = {
  info: "bg-[#1B52A8]/8 text-[#1B52A8] border-b border-[#1B52A8]/15",
  warning: "bg-amber-50 text-amber-800 border-b border-amber-200",
  danger: "bg-red-50 text-red-800 border-b border-red-200",
};

export default function BillingBanner() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The billing routes are exempt from the paywall, so this succeeds even for
    // a suspended hotel — which is precisely when the banner matters most.
    apiFetch("/hotel-settings/billing/subscription")
      .then((sub) => {
        if (cancelled) return;
        setNotice(buildNotice(sub?.status ?? null, sub?.billingEndDate ?? null));
      })
      .catch(() => {
        // Billing state is advisory here; a failed fetch must never break the
        // dashboard shell.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!notice) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm font-medium ${TONE_CLASSES[notice.tone]}`}>
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span>{notice.message}</span>
      <Link href="/dashboard/subscription" className="font-semibold underline underline-offset-2 hover:no-underline">
        {notice.cta}
      </Link>
    </div>
  );
}
