// Guest display naming — one implementation shared by the conversation list
// and the chat header so the two panels can never disagree.
//
// Instagram guests have two names: the one Meta gives us (igName/igUsername,
// refreshed by profile enrichment) and the staff-edited Guest.name. The IG name
// is primary; the staff alias goes in brackets after it, so staff still see
// whatever label they set without losing the guest's real identity.

export type MessageChannel = "WHATSAPP" | "INSTAGRAM";

export type GuestDisplayInput = {
  phone: string;
  name: string | null;
  channel: MessageChannel;
  igName?: string | null;
  igUsername?: string | null;
};

export type GuestDisplayName = {
  primary: string;
  staffAlias?: string;
  handle?: string;
};

export function guestDisplayName(g: GuestDisplayInput): GuestDisplayName {
  if (g.channel === "INSTAGRAM") {
    const primary = g.igName || g.igUsername || "Instagram user";
    const result: GuestDisplayName = { primary };
    if (g.igUsername) result.handle = `@${g.igUsername}`;
    // Only show the alias when it adds information — a staff name identical to
    // the IG name would just render as "Aisha (Aisha)".
    if (g.name && g.name !== primary) result.staffAlias = g.name;
    return result;
  }

  // WhatsApp — unchanged: staff name, else the phone number. No handle, no bracket.
  return { primary: g.name || g.phone };
}

/** Initials for the avatar fallback circle. */
export function guestInitials(g: GuestDisplayInput): string {
  if (g.channel === "INSTAGRAM") {
    const { primary } = guestDisplayName(g);
    // "Instagram user" is a placeholder, not a name — keep the generic badge.
    if (primary === "Instagram user") return "IG";
    return primary.slice(0, 2).toUpperCase();
  }
  return g.phone.replace(/\D/g, "").slice(-2);
}

/** 1234 → "1.2K", 1200000 → "1.2M". Null when there is nothing to show. */
export function formatFollowerCount(count: number | null | undefined): string | null {
  if (count == null) return null;
  if (count < 1000) return String(count);

  // Round FIRST, then pick the unit: 999999/1000 rounds to 1000.0, which would
  // render as "1000K" if the unit were chosen from the raw value.
  const k = Number((count / 1000).toFixed(1));
  if (k < 1000) return `${String(k).replace(/\.0$/, "")}K`;

  const m = Number((count / 1_000_000).toFixed(1));
  return `${String(m).replace(/\.0$/, "")}M`;
}

export type FollowBadge = "mutual" | "follows-you" | "you-follow" | null;

/**
 * Which single follow badge to render. All-null (not yet enriched, or
 * NO_CONSENT) → null: the header must look intentional before enrichment
 * lands, so we render nothing rather than a placeholder.
 */
export function followBadge(
  followsBusiness: boolean | null | undefined,
  businessFollows: boolean | null | undefined,
): FollowBadge {
  if (followsBusiness && businessFollows) return "mutual";
  if (followsBusiness) return "follows-you";
  if (businessFollows) return "you-follow";
  return null;
}
