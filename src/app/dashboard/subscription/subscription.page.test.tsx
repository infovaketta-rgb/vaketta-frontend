/**
 * Hotel Subscription page.
 *
 * Locks in the fixes:
 *  - the plan's real currency is used (the API omitted `currency`, so a USD plan
 *    fell back to the hotel's booking currency and rendered as "₹49.00");
 *  - overage comes from the server, not browser arithmetic;
 *  - a suspended hotel sees LIVE data, because the billing routes are exempt
 *    from the paywall — it used to get a static "email support" screen after a
 *    fragile `error.includes("expired")` string sniff;
 *  - one failing endpoint no longer blanks the whole page;
 *  - TrialConfig.trialMessage is finally rendered.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...a: any[]) => apiFetch(...a) }));
vi.mock("@/lib/useMounted", () => ({ useMounted: () => true }));

import SubscriptionPage from "./page";

const SUB_ACTIVE_USD = {
  status: "ACTIVE",
  billingStartDate: "2026-06-01T00:00:00Z",
  billingEndDate: "2026-07-01T00:00:00Z",
  trialMessage: null,
  plan: {
    id: "p1", name: "Growth", currency: "USD", priceMonthly: 4900,
    conversationLimit: 2000, aiReplyLimit: 1000,
    extraConversationCharge: 2, extraAiReplyCharge: 5,
  },
  snapshot: {
    planName: "Growth", currency: "USD", price: 4900,
    conversationLimit: 2000, aiReplyLimit: 1000,
    extraConversationCharge: 2, extraAiReplyCharge: 5,
    startDate: "2026-06-01T00:00:00Z", endDate: "2026-07-01T00:00:00Z", autoRenew: true,
  },
};

const USAGE_CLEAN = {
  current: { conversationsUsed: 100, aiRepliesUsed: 50, month: "2026-06" },
  history: [],
  overage: { conversationOverage: 0, aiReplyOverage: 0, conversationCharge: 0, aiReplyCharge: 0, total: 0 },
  currency: "USD",
  limits: { conversations: 2000, aiReplies: 1000 },
};

/** Route each of the page's four fetches to a canned response. */
function mockApi(overrides: Partial<Record<string, unknown>> = {}) {
  const routes: Record<string, unknown> = {
    "/hotel-settings/billing/subscription": SUB_ACTIVE_USD,
    "/hotel-settings/billing/usage": USAGE_CLEAN,
    "/hotel-settings/billing/plans": [],
    "/hotel-settings/billing/invoices": [],
    ...overrides,
  };
  apiFetch.mockImplementation((path: string) => {
    const value = routes[path];
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe("currency", () => {
  it("renders a USD plan in dollars, never the ₹ fallback", async () => {
    mockApi();
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    expect(screen.getByText(/\$49\.00/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("₹");
  });

  it("prefers the snapshot's currency over the live plan's", async () => {
    mockApi({
      "/hotel-settings/billing/subscription": {
        ...SUB_ACTIVE_USD,
        // The admin re-priced the plan in INR after this hotel subscribed. The
        // snapshot is what it is actually billed.
        plan: { ...SUB_ACTIVE_USD.plan, currency: "INR", priceMonthly: 249900 },
      },
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText(/\$49\.00/)).toBeInTheDocument());
  });
});

describe("overage comes from the server", () => {
  it("renders the server's figures rather than recomputing them", async () => {
    mockApi({
      "/hotel-settings/billing/usage": {
        ...USAGE_CLEAN,
        current: { conversationsUsed: 2500, aiRepliesUsed: 1200, month: "2026-06" },
        overage: {
          conversationOverage: 500, aiReplyOverage: 200,
          conversationCharge: 1000, aiReplyCharge: 1000, total: 2000,
        },
      },
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText(/Total overage/)).toBeInTheDocument());
    expect(screen.getByText(/\$20\.00/)).toBeInTheDocument();
    // "added to your next invoice" — a real charge, not the old "estimated".
    expect(screen.getByText(/next invoice/i)).toBeInTheDocument();
  });

  it("hides the overage block when nothing is over", async () => {
    mockApi();
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    expect(screen.queryByText(/Total overage/)).not.toBeInTheDocument();
  });
});

describe("a suspended hotel still sees its real data", () => {
  it("shows the plan, usage and a paused notice — not a static mailto screen", async () => {
    mockApi({
      "/hotel-settings/billing/subscription": { ...SUB_ACTIVE_USD, status: "EXPIRED" },
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Subscription expired")).toBeInTheDocument());
    // The live plan is still rendered — the old screen showed none of this.
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText(/\$49\.00/)).toBeInTheDocument();
    expect(screen.getByText(/still read every conversation/i)).toBeInTheDocument();
  });

  it("does not hijack the page just because an error mentions 'expired'", async () => {
    // The old page did `error.toLowerCase().includes("expired")`, so an
    // unrelated failure (e.g. a Meta token-expired error) blanked everything.
    mockApi({
      "/hotel-settings/billing/invoices": new Error("Media handle expired"),
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    expect(screen.queryByText("Subscription expired")).not.toBeInTheDocument();
  });
});

describe("PAST_DUE is a warning, not a suspension", () => {
  it("shows the overdue notice while keeping everything visible", async () => {
    mockApi({
      "/hotel-settings/billing/subscription": { ...SUB_ACTIVE_USD, status: "PAST_DUE" },
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Payment overdue")).toBeInTheDocument());
    expect(screen.queryByText("Subscription expired")).not.toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });
});

describe("trial message", () => {
  it("renders TrialConfig.trialMessage, which no endpoint used to return", async () => {
    mockApi({
      "/hotel-settings/billing/subscription": {
        ...SUB_ACTIVE_USD,
        status: "TRIALING",
        trialMessage: "You are on a 14-day free trial.",
      },
    });
    render(<SubscriptionPage />);

    await waitFor(() =>
      expect(screen.getByText("You are on a 14-day free trial.")).toBeInTheDocument(),
    );
  });
});

describe("partial failures", () => {
  it("still renders the plan when /plans and /invoices both fail", async () => {
    // Promise.all made this all-or-nothing: a failed /plans call hid the
    // customer's own plan and usage too.
    mockApi({
      "/hotel-settings/billing/plans": new Error("boom"),
      "/hotel-settings/billing/invoices": new Error("boom"),
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    expect(screen.getByText(/Conversations/)).toBeInTheDocument();
  });
});

describe("invoices", () => {
  it("lists issued invoices with their period and total", async () => {
    mockApi({
      "/hotel-settings/billing/invoices": [
        {
          id: "i1", number: "INV-2026-00001", status: "PAID", currency: "USD",
          subtotal: 4900, overageTotal: 0, total: 4900, amountPaid: 4900,
          periodStart: "2026-05-01T00:00:00Z", periodEnd: "2026-06-01T00:00:00Z",
          dueAt: "2026-06-08T00:00:00Z", paidAt: "2026-06-02T00:00:00Z", lineItems: [],
        },
      ],
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });
});
