/**
 * lib/razorpay.ts
 *
 * Razorpay Standard Checkout loader + launcher.
 *
 * The browser is a COURIER, never an authority. Nothing here decides that an
 * invoice is paid: it opens the hosted checkout, receives a signed handler
 * payload, and hands that payload straight back to the server for verification.
 * The server-to-server webhook settles the same payment independently, so a
 * user who closes the tab mid-redirect is still credited.
 *
 * `key_id` is supplied per-request by the order endpoint rather than baked in
 * at build time, so switching Razorpay test<->live needs no frontend rebuild.
 * The key SECRET never reaches this file.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let loadPromise: Promise<boolean> | null = null;

/**
 * Inject checkout.js once, and reuse the same promise for every later call.
 *
 * Memoised because the Pay button can be clicked on several invoices in one
 * session; without it each click would append another <script> tag.
 */
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      // Reset so a later attempt can retry — a blocked or flaky first load
      // should not permanently disable payment for the session.
      loadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

export type CheckoutHandlerPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type OpenCheckoutOptions = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  hotelName?: string | undefined;
  prefillEmail?: string | undefined;
  /** Signed payload — must be sent to the server, never trusted locally. */
  onSuccess: (payload: CheckoutHandlerPayload) => void;
  /** User closed the modal. NOT a failure, and NOT a payment. */
  onDismiss: () => void;
};

/**
 * Open the hosted checkout.
 *
 * Returns false when checkout.js could not be loaded (offline, blocked by an
 * extension) so the caller can surface a real message instead of a dead button.
 */
export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<boolean> {
  const ready = await loadRazorpayCheckout();
  if (!ready || !window.Razorpay) return false;

  const rzp = new window.Razorpay({
    key: opts.keyId,
    order_id: opts.orderId,
    // Display only — Razorpay charges what the ORDER says, not what is passed
    // here, so a tampered value in devtools cannot change the amount taken.
    amount: opts.amount,
    currency: opts.currency,
    name: opts.hotelName || "Vaketta",
    description: `Invoice ${opts.invoiceNumber}`,
    ...(opts.prefillEmail ? { prefill: { email: opts.prefillEmail } } : {}),
    theme: { color: "#1B52A8" },
    handler: (response: CheckoutHandlerPayload) => opts.onSuccess(response),
    modal: { ondismiss: () => opts.onDismiss() },
  });

  rzp.open();
  return true;
}
