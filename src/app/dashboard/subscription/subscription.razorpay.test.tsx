/**
 * Subscription page — Razorpay "Pay now".
 *
 * Locks in the browser's role as a COURIER, not an authority:
 *  - the Pay button appears only for an OPEN, unpaid, INR invoice;
 *  - clicking it never sends an amount — the server derives that;
 *  - a successful checkout hands the SIGNED payload back for verification and
 *    only then refetches; the page never marks anything paid on its own;
 *  - dismissing the modal is neither success nor failure;
 *  - a verification error is shown WITHOUT blanking the page, and says the
 *    payment may still land (the webhook is authoritative).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...a: any[]) => apiFetch(...a) }));
vi.mock("@/lib/useMounted", () => ({ useMounted: () => true }));

const openRazorpayCheckout = vi.fn();
vi.mock("@/lib/razorpay", () => ({
  openRazorpayCheckout: (...a: any[]) => openRazorpayCheckout(...a),
}));

import SubscriptionPage from "./page";

const SUB = {
  status: "ACTIVE",
  periodStart: "2026-08-01T00:00:00Z",
  periodEnd: "2026-09-01T00:00:00Z",
  periodEndInclusive: "2026-08-31T23:59:59.999Z",
  billingStartDate: "2026-08-01T00:00:00Z",
  billingEndDate: "2026-09-01T00:00:00Z",
  billingAnchorDay: 1,
  trialConverted: false,
  trialEndsAt: null,
  scheduledPlan: null,
  trialMessage: null,
  plan: {
    id: "p1", name: "Starter", currency: "INR", priceMonthly: 249900,
    conversationLimit: 2000, aiReplyLimit: 1000,
    extraConversationCharge: 50, extraAiReplyCharge: 200,
  },
  snapshot: {
    planName: "Starter", currency: "INR", price: 249900,
    conversationLimit: 2000, aiReplyLimit: 1000,
    extraConversationCharge: 50, extraAiReplyCharge: 200,
    startDate: "2026-08-01T00:00:00Z", endDate: "2026-09-01T00:00:00Z", autoRenew: true,
  },
};

const USAGE = {
  current: { conversationsUsed: 10, aiRepliesUsed: 5 },
  history: [],
  overage: { conversationOverage: 0, aiReplyOverage: 0, conversationCharge: 0, aiReplyCharge: 0, total: 0 },
  period: {
    periodStart: "2026-08-01T00:00:00Z",
    periodEnd: "2026-09-01T00:00:00Z",
    periodEndInclusive: "2026-08-31T23:59:59.999Z",
    month: "2026-08",
  },
  currency: "INR",
  limits: { conversations: 2000, aiReplies: 1000 },
};

const openInvoice = (over: Record<string, unknown> = {}) => ({
  id: "inv_1",
  number: "INV-2026-00001",
  status: "OPEN",
  currency: "INR",
  subtotal: 249900,
  overageTotal: 0,
  total: 249900,
  amountPaid: 0,
  periodStart: "2026-08-01T00:00:00Z",
  periodEnd: "2026-09-01T00:00:00Z",
  issuedAt: "2026-08-01T00:00:00Z",
  dueAt: "2026-08-08T00:00:00Z",
  paidAt: null,
  lineItems: [],
  ...over,
});

const ORDER = {
  orderId: "order_ABC",
  amount: 249900,
  currency: "INR",
  keyId: "rzp_test_fakekey",
  invoiceNumber: "INV-2026-00001",
  reused: false,
};

function mockApi(invoices: unknown[], overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    "/hotel-settings/billing/subscription": SUB,
    "/hotel-settings/billing/usage": USAGE,
    "/hotel-settings/billing/plans": [],
    "/hotel-settings/billing/invoices": invoices,
    "/hotel-settings/billing/invoices/inv_1/razorpay-order": ORDER,
    "/hotel-settings/billing/razorpay/verify": { status: "success", invoiceId: "inv_1" },
    "/hotel-settings/billing/payments": [],
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
  openRazorpayCheckout.mockReset();
  openRazorpayCheckout.mockResolvedValue(true);
});

// ── Button visibility ────────────────────────────────────────────────────────

describe("Pay now button", () => {
  it("is shown for an OPEN unpaid INR invoice", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /pay now/i })).toBeInTheDocument());
  });

  it("is HIDDEN for a PAID invoice", async () => {
    mockApi([openInvoice({ status: "PAID", amountPaid: 249900, paidAt: "2026-08-05T00:00:00Z" })]);
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });

  it("is HIDDEN for a VOID invoice", async () => {
    mockApi([openInvoice({ status: "VOID" })]);
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });

  it("is HIDDEN for a fully covered invoice", async () => {
    mockApi([openInvoice({ amountPaid: 249900 })]);
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });

  it("is HIDDEN for a non-INR invoice — Razorpay is INR-only in this stage", async () => {
    mockApi([openInvoice({ currency: "USD" })]);
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });
});

// ── Payment flow ─────────────────────────────────────────────────────────────

describe("payment flow", () => {
  it("creates an order and opens checkout WITHOUT sending an amount", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    const btn = await screen.findByRole("button", { name: /pay now/i });
    await userEvent.click(btn);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/hotel-settings/billing/invoices/inv_1/razorpay-order",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    // The request body carries no amount — the server derives it.
    const call = apiFetch.mock.calls.find((c) => String(c[0]).includes("razorpay-order"))!;
    expect(JSON.parse(call[1].body)).toEqual({});

    await waitFor(() =>
      expect(openRazorpayCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: "order_ABC", keyId: "rzp_test_fakekey", amount: 249900 }),
      ),
    );
  });

  it("sends the SIGNED payload for server verification on success", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));
    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled());

    const payload = {
      razorpay_order_id: "order_ABC",
      razorpay_payment_id: "pay_XYZ",
      razorpay_signature: "sig",
    };
    // act(): these handlers are invoked directly rather than by a DOM event,
    // so React needs the update flushed explicitly.
    await act(async () => {
      await openRazorpayCheckout.mock.calls[0]![0].onSuccess(payload);
    });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/hotel-settings/billing/razorpay/verify",
        expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
      ),
    );
  });

  it("confirms and REFETCHES billing data after verification", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));
    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled());

    apiFetch.mockClear();
    await act(async () => {
      await openRazorpayCheckout.mock.calls[0]![0].onSuccess({
        razorpay_order_id: "order_ABC",
        razorpay_payment_id: "pay_XYZ",
        razorpay_signature: "sig",
      });
    });

    await waitFor(() => expect(screen.getByText(/payment received/i)).toBeInTheDocument());
    expect(apiFetch).toHaveBeenCalledWith("/hotel-settings/billing/invoices");
    expect(apiFetch).toHaveBeenCalledWith("/hotel-settings/billing/subscription");
  });

  it("reports an already-recorded payment distinctly", async () => {
    mockApi([openInvoice()], {
      "/hotel-settings/billing/razorpay/verify": { status: "already_processed", invoiceId: "inv_1" },
    });
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));
    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled());

    await act(async () => {
      await openRazorpayCheckout.mock.calls[0]![0].onSuccess({
        razorpay_order_id: "order_ABC",
        razorpay_payment_id: "pay_XYZ",
        razorpay_signature: "sig",
      });
    });

    await waitFor(() => expect(screen.getByText(/already recorded/i)).toBeInTheDocument());
  });

  it("treats DISMISSAL as neither success nor failure", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));
    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled());

    apiFetch.mockClear();
    act(() => {
      openRazorpayCheckout.mock.calls[0]![0].onDismiss();
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /pay now/i })).not.toBeDisabled(),
    );
    // No verification, no success message.
    expect(apiFetch).not.toHaveBeenCalledWith(
      "/hotel-settings/billing/razorpay/verify",
      expect.anything(),
    );
    expect(screen.queryByText(/payment received/i)).not.toBeInTheDocument();
  });
});

// ── Failure states ───────────────────────────────────────────────────────────

describe("failure states", () => {
  it("surfaces an order-creation failure without blanking the page", async () => {
    mockApi([openInvoice()], {
      "/hotel-settings/billing/invoices/inv_1/razorpay-order": new Error("Online payment is not configured."),
    });
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));

    await waitFor(() => expect(screen.getByText(/not configured/i)).toBeInTheDocument());
    // The invoice table is still there — the page did not collapse into an error.
    expect(screen.getByText("INV-2026-00001")).toBeInTheDocument();
  });

  it("re-enables the button after a failed order so the user can retry", async () => {
    mockApi([openInvoice()], {
      "/hotel-settings/billing/invoices/inv_1/razorpay-order": new Error("boom"),
    });
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /pay now/i })).not.toBeDisabled(),
    );
  });

  it("explains that a failed verification may still settle via the webhook", async () => {
    mockApi([openInvoice()], {
      "/hotel-settings/billing/razorpay/verify": new Error(
        "We could not confirm the payment immediately. It will be updated shortly.",
      ),
    });
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));
    await waitFor(() => expect(openRazorpayCheckout).toHaveBeenCalled());

    await act(async () => {
      await openRazorpayCheckout.mock.calls[0]![0].onSuccess({
        razorpay_order_id: "order_ABC",
        razorpay_payment_id: "pay_XYZ",
        razorpay_signature: "sig",
      });
    });

    await waitFor(() => expect(screen.getByText(/updated shortly/i)).toBeInTheDocument());
  });

  it("reports a checkout window that could not be opened", async () => {
    openRazorpayCheckout.mockResolvedValue(false);
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /pay now/i }));

    await waitFor(() =>
      expect(screen.getByText(/could not load the payment window/i)).toBeInTheDocument(),
    );
  });
});


// ── Manual / offline payment ─────────────────────────────────────────────────

/**
 * The offline route exists alongside Razorpay and must not interfere with it.
 * Once a claim is under review the invoice offers NEITHER payment button —
 * paying again while the first payment is being verified is how a hotel ends up
 * paying twice.
 */
describe("manual payment", () => {
  const pendingClaim = {
    id: "pay_1",
    invoiceId: "inv_1",
    status: "PENDING",
    currency: "INR",
    amount: 249900,
    method: "BANK_TRANSFER",
    reference: "UTR123456",
    claimedPaidAt: "2026-08-20T00:00:00Z",
    failureReason: null,
    createdAt: "2026-08-20T00:00:00Z",
  };

  it("offers 'Report payment' on an OPEN invoice", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /report payment/i })).toBeInTheDocument(),
    );
  });

  it("offers it for a NON-INR invoice, where Razorpay is unavailable", async () => {
    mockApi([openInvoice({ currency: "USD" })]);
    render(<SubscriptionPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /report payment/i })).toBeInTheDocument(),
    );
    // Razorpay stays INR-only.
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
  });

  it("shows UNDER REVIEW and hides BOTH pay actions once a claim is pending", async () => {
    mockApi([openInvoice()], { "/hotel-settings/billing/payments": [pendingClaim] });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText(/under review/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /report payment/i })).not.toBeInTheDocument();
  });

  it("restores the pay actions once the claim is no longer pending", async () => {
    mockApi([openInvoice()], {
      "/hotel-settings/billing/payments": [{ ...pendingClaim, status: "FAILED", failureReason: "UTR not found" }],
    });
    render(<SubscriptionPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /report payment/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/under review/i)).not.toBeInTheDocument();
  });

  it("shows nothing payable on a PAID invoice even with stale claim data", async () => {
    mockApi([openInvoice({ status: "PAID", amountPaid: 249900 })], {
      "/hotel-settings/billing/payments": [pendingClaim],
    });
    render(<SubscriptionPage />);

    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /report payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/under review/i)).not.toBeInTheDocument();
  });

  it("opens the submission form", async () => {
    mockApi([openInvoice()]);
    render(<SubscriptionPage />);

    await userEvent.click(await screen.findByRole("button", { name: /report payment/i }));

    expect(await screen.findByRole("button", { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.getByText(/verify this against our bank records/i)).toBeInTheDocument();
  });

  it("does not blank the page when the payments endpoint fails", async () => {
    mockApi([openInvoice()], { "/hotel-settings/billing/payments": new Error("boom") });
    render(<SubscriptionPage />);

    // allSettled: one failing endpoint must not take the rest of the page down.
    await waitFor(() => expect(screen.getByText("INV-2026-00001")).toBeInTheDocument());
  });
});
