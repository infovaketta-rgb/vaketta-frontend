import { describe, it, expect, vi, afterEach } from "vitest";
import { statusMeta, normalizeStatus, isSuspendedStatus, daysUntil } from "./subscriptionStatus";

const ALL = ["TRIALING", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELED"] as const;

afterEach(() => vi.useRealTimers());

describe("normalizeStatus", () => {
  it("accepts every enum value", () => {
    for (const s of ALL) expect(normalizeStatus(s)).toBe(s);
  });

  it("is case-insensitive", () => {
    expect(normalizeStatus("active")).toBe("ACTIVE");
    expect(normalizeStatus("Expired")).toBe("EXPIRED");
  });

  it('maps the legacy "trial" spelling to TRIALING', () => {
    // Old rows and cached pages used lowercase "trial"; without this they would
    // render as an unstyled "Unknown" badge mid-rollout.
    expect(normalizeStatus("trial")).toBe("TRIALING");
    expect(normalizeStatus("TRIAL")).toBe("TRIALING");
  });

  it("returns null for junk rather than guessing", () => {
    expect(normalizeStatus("banana")).toBeNull();
    expect(normalizeStatus("")).toBeNull();
    expect(normalizeStatus(null)).toBeNull();
    expect(normalizeStatus(undefined)).toBeNull();
  });
});

describe("statusMeta", () => {
  it("gives every status a label, badge and dot — no unstyled fallthrough", () => {
    for (const s of ALL) {
      const meta = statusMeta(s);
      expect(meta.label).toBeTruthy();
      expect(meta.badge).toContain("border");
      expect(meta.dot).toBeTruthy();
      expect(meta.description).toBeTruthy();
    }
  });

  it("covers PAST_DUE and CANCELED, which the old ad-hoc maps dropped", () => {
    expect(statusMeta("PAST_DUE").label).toBe("Payment due");
    expect(statusMeta("CANCELED").label).toBe("Cancelled");
  });

  it("falls back to a neutral Unknown badge for junk", () => {
    expect(statusMeta("banana").label).toBe("Unknown");
    expect(statusMeta(undefined).label).toBe("Unknown");
  });
});

describe("isSuspendedStatus — who has automated replies paused", () => {
  it.each([
    ["EXPIRED", true],
    ["CANCELED", true],
    ["ACTIVE", false],
    ["TRIALING", false],
    // The grace window. Treating PAST_DUE as suspended would cut off a customer
    // whose payment is merely in flight.
    ["PAST_DUE", false],
  ])("%s → %s", (status, expected) => {
    expect(isSuspendedStatus(status)).toBe(expected);
  });

  it("is false for an unknown status — never lock someone out on a guess", () => {
    expect(isSuspendedStatus("banana")).toBe(false);
    expect(isSuspendedStatus(null)).toBe(false);
  });

  it("PAST_DUE copy reassures rather than alarms", () => {
    expect(statusMeta("PAST_DUE").description).toMatch(/still running/i);
  });

  it("suspended copy states the data is still readable", () => {
    expect(statusMeta("EXPIRED").description).toMatch(/still read/i);
    expect(statusMeta("CANCELED").description).toMatch(/still read/i);
  });
});

describe("daysUntil", () => {
  it("counts whole days ahead, rounding up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));

    expect(daysUntil("2026-06-08T00:00:00Z")).toBe(7);
    expect(daysUntil("2026-06-01T06:00:00Z")).toBe(1);
  });

  it("goes negative once the date has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));
    expect(daysUntil("2026-06-01T00:00:00Z")).toBeLessThan(0);
  });

  it("is null for a missing or malformed date", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
    expect(daysUntil("not a date")).toBeNull();
  });
});
