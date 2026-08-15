/**
 * money.ts — one place that turns minor units into a display string.
 *
 * WHY THIS EXISTS
 * ---------------
 * Four separate currency-symbol tables had grown up in the codebase
 * (`lib/locale.ts`, `admin/plans/page.tsx`, `admin/billing/page.tsx`,
 * `get-started/page.tsx`), each with a different set of currencies, and money
 * was formatted inconsistently around them:
 *
 *  - `lib/locale.ts`'s `getCurrencySymbol` falls back to **₹ for anything it
 *    doesn't recognise, including `undefined`**. Combined with the API not
 *    returning `currency` at all, a USD plan rendered as "₹49.00".
 *  - `admin/hotels/[id]` printed raw minor units after a hardcoded "¢", so an
 *    INR plan's ₹0.50 overage rate displayed as "¢50".
 *  - `admin/billing` rendered platform MRR with a hardcoded "$" while the plans
 *    feeding it were multi-currency.
 *
 * The rule here: an unknown currency renders its ISO code, never a guessed
 * symbol. Showing "XAF 49.00" is honest; showing "₹49.00" for a USD plan is not.
 */

/** ISO 4217 → display symbol. Superset of the four tables this replaces. */
const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SAR: "﷼",
  QAR: "QR",
  SGD: "S$",
  MYR: "RM",
  THB: "฿",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  CHF: "Fr",
  HKD: "HK$",
  IDR: "Rp",
  PHP: "₱",
  LKR: "Rs",
  NPR: "रू",
};

/**
 * Currencies with no minor unit — amounts are whole units, not hundredths.
 * Dividing JPY by 100 would understate every price by two orders of magnitude.
 */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"]);

/**
 * Display symbol for a currency code, or the code itself when unrecognised.
 * Never guesses — see the note above about the ₹ fallback.
 */
export function currencySymbol(code?: string | null): string {
  if (!code) return "";
  const upper = code.toUpperCase();
  return SYMBOLS[upper] ?? upper;
}

/** How many minor units make one major unit for this currency. */
export function minorUnitFactor(code?: string | null): number {
  return code && ZERO_DECIMAL.has(code.toUpperCase()) ? 1 : 100;
}

export type FormatOptions = {
  /** Drop ".00" on whole amounts. Useful in dense tables. */
  compact?: boolean;
};

/**
 * Format an integer minor-unit amount for display, e.g. 249900 + "INR" → "₹2,499.00".
 *
 * An unknown code renders as "XYZ 2,499.00" — spaced, so it reads as a code
 * rather than a mangled symbol.
 */
export function formatMinor(amount: number | null | undefined, code?: string | null, opts: FormatOptions = {}): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const factor = minorUnitFactor(code);
  const major = value / factor;

  const known = !!code && code.toUpperCase() in SYMBOLS;
  const symbol = currencySymbol(code);

  const decimals = factor === 1 ? 0 : opts.compact && Number.isInteger(major) ? 0 : 2;
  const formatted = major.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (!code) return formatted;
  return known ? `${symbol}${formatted}` : `${symbol} ${formatted}`;
}

/**
 * Format a per-unit overage rate. These are small fractions of a major unit
 * (₹0.50 per conversation), so they always keep their decimals.
 */
export function formatRate(amount: number | null | undefined, code?: string | null): string {
  return formatMinor(amount, code);
}

/** Convert a major-unit form input ("49.99") to integer minor units. */
export function toMinor(major: string | number, code?: string | null): number {
  const n = typeof major === "number" ? major : Number(String(major).trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * minorUnitFactor(code));
}

/** Convert integer minor units to a major-unit string for a form input. */
export function toMajorInput(minor: number | null | undefined, code?: string | null): string {
  const value = typeof minor === "number" && Number.isFinite(minor) ? minor : 0;
  return String(value / minorUnitFactor(code));
}

/** "Unlimited" is the product's convention for a limit of 0. */
export function formatLimit(n: number | null | undefined): string {
  return !n || n <= 0 ? "Unlimited" : n.toLocaleString("en-US");
}
