import { describe, it, expect } from "vitest";
import {
  formatMinor,
  formatRate,
  formatLimit,
  currencySymbol,
  minorUnitFactor,
  toMinor,
  toMajorInput,
} from "./money";

describe("currencySymbol — never guesses", () => {
  it("maps known ISO codes to their symbol", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("GBP")).toBe("£");
  });

  it("is case-insensitive", () => {
    expect(currencySymbol("inr")).toBe("₹");
  });

  it("returns the CODE for an unknown currency — not a guessed symbol", () => {
    // lib/locale.ts's getCurrencySymbol falls back to ₹ for anything it doesn't
    // recognise, which is how a USD plan came to render as "₹49.00".
    expect(currencySymbol("XAF")).toBe("XAF");
    expect(currencySymbol("ZZZ")).toBe("ZZZ");
  });

  it("returns an empty string for no currency rather than defaulting to ₹", () => {
    expect(currencySymbol(undefined)).toBe("");
    expect(currencySymbol(null)).toBe("");
    expect(currencySymbol("")).toBe("");
  });
});

describe("formatMinor", () => {
  it("converts minor units to a major-unit display string", () => {
    expect(formatMinor(249900, "INR")).toBe("₹2,499.00");
    expect(formatMinor(4900, "USD")).toBe("$49.00");
  });

  it("never shows ₹ for a non-INR currency", () => {
    expect(formatMinor(4900, "USD")).not.toContain("₹");
    expect(formatMinor(4900, "GBP")).toBe("£49.00");
  });

  it("spaces an unknown currency code so it reads as a code", () => {
    expect(formatMinor(249900, "XYZ")).toBe("XYZ 2,499.00");
  });

  it("does not divide zero-decimal currencies by 100", () => {
    // ¥4900 is 4900 yen, not ¥49 — JPY has no minor unit.
    expect(formatMinor(4900, "JPY")).toBe("¥4,900");
    expect(minorUnitFactor("JPY")).toBe(1);
    expect(minorUnitFactor("INR")).toBe(100);
  });

  it("groups thousands", () => {
    expect(formatMinor(123456789, "INR")).toBe("₹1,234,567.89");
  });

  it("compact drops .00 on whole amounts but keeps real decimals", () => {
    expect(formatMinor(249900, "INR", { compact: true })).toBe("₹2,499");
    expect(formatMinor(249950, "INR", { compact: true })).toBe("₹2,499.50");
  });

  it("handles 0 and missing amounts without NaN", () => {
    expect(formatMinor(0, "INR")).toBe("₹0.00");
    expect(formatMinor(null, "INR")).toBe("₹0.00");
    expect(formatMinor(undefined, "INR")).toBe("₹0.00");
    expect(formatMinor(NaN, "INR")).toBe("₹0.00");
  });

  it("omits the symbol entirely when no currency is known", () => {
    expect(formatMinor(249900)).toBe("2,499.00");
  });
});

describe("formatRate — small per-unit overage charges", () => {
  it("keeps decimals, so ₹0.50 does not render as '¢50'", () => {
    // admin/hotels/[id] printed raw minor units after a hardcoded "¢".
    expect(formatRate(50, "INR")).toBe("₹0.50");
    expect(formatRate(200, "INR")).toBe("₹2.00");
    expect(formatRate(2, "USD")).toBe("$0.02");
  });
});

describe("formatLimit", () => {
  it("renders 0 as Unlimited — the product's convention", () => {
    expect(formatLimit(0)).toBe("Unlimited");
    expect(formatLimit(null)).toBe("Unlimited");
    expect(formatLimit(undefined)).toBe("Unlimited");
  });

  it("groups real limits", () => {
    expect(formatLimit(2000)).toBe("2,000");
    expect(formatLimit(1)).toBe("1");
  });
});

describe("toMinor / toMajorInput round-trip", () => {
  it("converts a form value to integer minor units", () => {
    expect(toMinor("2499", "INR")).toBe(249900);
    expect(toMinor("49.99", "USD")).toBe(4999);
    expect(toMinor(0.5, "INR")).toBe(50);
  });

  it("respects zero-decimal currencies", () => {
    expect(toMinor("4900", "JPY")).toBe(4900);
  });

  it("rounds rather than producing a fractional minor unit", () => {
    expect(Number.isInteger(toMinor("49.999", "USD"))).toBe(true);
  });

  it("is 0 for unparseable input instead of NaN", () => {
    expect(toMinor("abc", "INR")).toBe(0);
    expect(toMinor("", "INR")).toBe(0);
  });

  it("round-trips through the edit form without drift", () => {
    for (const minor of [0, 50, 4900, 249900, 599900]) {
      expect(toMinor(toMajorInput(minor, "INR"), "INR")).toBe(minor);
    }
  });
});
