/**
 * Display rules for guest identity in the chat list + chat header.
 *
 * The load-bearing rule: for Instagram guests the Meta-supplied name is
 * PRIMARY and the staff-edited Guest.name goes in brackets after it. Staff
 * ownership of Guest.name is preserved everywhere else (enrichment never
 * writes it), so this is purely how the two names are presented together.
 *
 * WhatsApp behaviour must be untouched: name || phone, no handle, no bracket.
 */

import { describe, it, expect } from "vitest";
import {
  guestDisplayName,
  guestInitials,
  formatFollowerCount,
  followBadge,
} from "./guestDisplay";

const IG = {
  phone:   "996345286534670", // IGSID for Instagram guests
  channel: "INSTAGRAM" as const,
};
const WA = {
  phone:   "919746372102",
  channel: "WHATSAPP" as const,
};

describe("guestDisplayName — Instagram", () => {
  it("uses igName as primary and exposes the @handle", () => {
    expect(guestDisplayName({ ...IG, name: null, igName: "Aisha K", igUsername: "aisha.travels" }))
      .toEqual({ primary: "Aisha K", handle: "@aisha.travels" });
  });

  it("falls back to the username when igName is absent", () => {
    expect(guestDisplayName({ ...IG, name: null, igName: null, igUsername: "aisha.travels" }))
      .toEqual({ primary: "aisha.travels", handle: "@aisha.travels" });
  });

  it("falls back to a placeholder when nothing is enriched yet", () => {
    expect(guestDisplayName({ ...IG, name: null, igName: null, igUsername: null }))
      .toEqual({ primary: "Instagram user" });
  });

  it("puts the staff-edited name in brackets after the IG name", () => {
    const out = guestDisplayName({ ...IG, name: "Room 402 guest", igName: "Aisha K", igUsername: "aisha.travels" });
    expect(out).toEqual({
      primary:    "Aisha K",
      handle:     "@aisha.travels",
      staffAlias: "Room 402 guest",
    });
  });

  it("omits the alias when it would duplicate the primary name", () => {
    const out = guestDisplayName({ ...IG, name: "Aisha K", igName: "Aisha K", igUsername: "aisha.travels" });
    expect(out.staffAlias).toBeUndefined();
  });

  it("shows the staff name as an alias even before enrichment lands", () => {
    const out = guestDisplayName({ ...IG, name: "Walk-in guest", igName: null, igUsername: null });
    expect(out).toEqual({ primary: "Instagram user", staffAlias: "Walk-in guest" });
  });
});

describe("guestDisplayName — WhatsApp (unchanged)", () => {
  it("uses the staff name when set, with no handle or bracket", () => {
    expect(guestDisplayName({ ...WA, name: "Ravi" })).toEqual({ primary: "Ravi" });
  });

  it("falls back to the phone number", () => {
    expect(guestDisplayName({ ...WA, name: null })).toEqual({ primary: "919746372102" });
  });

  it("ignores Instagram fields if they somehow exist on a WhatsApp row", () => {
    expect(guestDisplayName({ ...WA, name: null, igName: "Aisha", igUsername: "aisha" }))
      .toEqual({ primary: "919746372102" });
  });
});

describe("guestInitials", () => {
  it("Instagram: first two characters of the primary name, uppercased", () => {
    expect(guestInitials({ ...IG, name: null, igName: "Aisha K", igUsername: "aisha" })).toBe("AI");
  });

  it("Instagram: falls back to IG when nothing is enriched", () => {
    expect(guestInitials({ ...IG, name: null, igName: null, igUsername: null })).toBe("IG");
  });

  it("WhatsApp: last two phone digits", () => {
    expect(guestInitials({ ...WA, name: "Ravi" })).toBe("02");
  });
});

describe("formatFollowerCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1K"],
    [1234, "1.2K"],
    [12345, "12.3K"],
    // Rounds up across the unit boundary — must not render as "1000K".
    [999999, "1M"],
    [1_000_000, "1M"],
    [1_200_000, "1.2M"],
    [15_400_000, "15.4M"],
  ])("formats %i as %s", (input, expected) => {
    expect(formatFollowerCount(input)).toBe(expected);
  });

  it("returns null when there is no count (hidden in the UI)", () => {
    expect(formatFollowerCount(null)).toBeNull();
    expect(formatFollowerCount(undefined)).toBeNull();
  });
});

describe("followBadge", () => {
  it("both directions → a single Mutual badge", () => {
    expect(followBadge(true, true)).toBe("mutual");
  });

  it("guest follows the hotel → Follows you", () => {
    expect(followBadge(true, false)).toBe("follows-you");
  });

  it("hotel follows the guest → You follow", () => {
    expect(followBadge(false, true)).toBe("you-follow");
  });

  it("neither → no badge", () => {
    expect(followBadge(false, false)).toBeNull();
  });

  it("not yet enriched (all null) → no badge, no placeholder", () => {
    expect(followBadge(null, null)).toBeNull();
    expect(followBadge(undefined, undefined)).toBeNull();
  });
});
