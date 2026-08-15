/**
 * subscriptionStatus.ts — one description of what each status means and how it
 * looks.
 *
 * WHY THIS EXISTS
 * ---------------
 * Status was a bare `string` on the frontend with three separate ad-hoc style
 * maps (`dashboard/subscription`, `admin/billing`, `admin/hotels/[id]`), each
 * recognising only "active" | "trial" | "expired" and rendering anything else as
 * an unstyled grey badge. The backend now has a real `SubscriptionStatus` enum
 * which adds PAST_DUE and CANCELED — values every one of those maps would have
 * silently dropped on the floor.
 */

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELED";

export type StatusMeta = {
  label: string;
  /** Tailwind classes for a pill badge. */
  badge: string;
  /** Solid dot colour, for the leading indicator. */
  dot: string;
  /** True when automated replies are paused. */
  suspended: boolean;
  /** Short explanation for the hotel-facing UI. */
  description: string;
};

const META: Record<SubscriptionStatus, StatusMeta> = {
  TRIALING: {
    label: "Trial",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    suspended: false,
    description: "You're on a free trial. Choose a plan before it ends to keep your automation running.",
  },
  ACTIVE: {
    label: "Active",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    suspended: false,
    description: "Your subscription is active.",
  },
  PAST_DUE: {
    // The grace window — service continues, so this must not read as an outage.
    label: "Payment due",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    suspended: false,
    description:
      "An invoice is overdue. Everything is still running, but automated replies will pause if it stays unpaid.",
  },
  EXPIRED: {
    label: "Expired",
    badge: "text-red-600 bg-red-50 border-red-200",
    dot: "bg-red-500",
    suspended: true,
    description:
      "Automated replies are paused. You can still read every conversation and booking — renew to resume.",
  },
  CANCELED: {
    label: "Cancelled",
    badge: "text-slate-600 bg-slate-50 border-slate-200",
    dot: "bg-slate-400",
    suspended: true,
    description:
      "This subscription was cancelled. You can still read every conversation and booking — choose a plan to resume.",
  },
};

const UNKNOWN: StatusMeta = {
  label: "Unknown",
  badge: "text-slate-500 bg-slate-50 border-slate-200",
  dot: "bg-slate-400",
  suspended: false,
  description: "",
};

/**
 * Normalise a status from the API. Accepts the legacy lowercase spellings
 * ("trial" | "active" | "expired") so a cached page or an older deploy doesn't
 * render an unstyled badge mid-rollout.
 */
export function normalizeStatus(raw?: string | null): SubscriptionStatus | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper in META) return upper as SubscriptionStatus;
  if (upper === "TRIAL") return "TRIALING";
  return null;
}

export function statusMeta(raw?: string | null): StatusMeta {
  const status = normalizeStatus(raw);
  return status ? META[status] : UNKNOWN;
}

/** True when automated replies are paused for this status. */
export function isSuspendedStatus(raw?: string | null): boolean {
  return statusMeta(raw).suspended;
}

/** Whole days from now until `iso`. Negative once it has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}
