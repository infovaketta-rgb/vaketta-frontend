"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getAvatarColor } from "@/lib/avatar";

type GuestAvatarProps = {
  /** Mirrored avatar URL (media.vaketta.com / local /uploads). Never a Meta CDN URL. */
  url?: string | null;
  /** Stable string the fallback colour is derived from (phone / IGSID). */
  seed: string;
  initials: string;
  size: number;
};

/**
 * Guest avatar with an initials-circle fallback.
 *
 * The image can fail even when `url` is set — an Instagram guest can delete
 * their photo, and a stale mirrored object can 404 — so an onError always
 * falls back to the initials circle rather than leaving a broken image.
 */
export default function GuestAvatar({ url, seed, initials, size }: GuestAvatarProps) {
  const [failed, setFailed] = useState(false);

  // A new URL deserves a fresh attempt — otherwise one failure would suppress
  // the avatar for every guest rendered by this component instance afterwards.
  useEffect(() => { setFailed(false); }, [url]);

  if (url && !failed) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width:           size,
        height:          size,
        backgroundColor: getAvatarColor(seed),
        fontSize:        Math.round(size * 0.32),
      }}
    >
      {initials}
    </div>
  );
}
