"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getHotelName, getUserName, getUserRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket, resetSocket } from "@/lib/socket";
import { useMounted } from "@/lib/useMounted";
import { saveLocale } from "@/lib/locale";

// ── helpers ────────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                  "Overview",
  "/dashboard/chats":            "Chats",
  "/dashboard/bookings":         "Bookings",
  "/dashboard/users":            "User Management",
  "/dashboard/room-types":       "Room Types",
  "/dashboard/settings":         "Settings",
  "/dashboard/change-password":  "Change Password",
  "/dashboard/configuration":    "Hotel Configuration",
  "/dashboard/bot":              "WhatsApp Bot",
  "/dashboard/media":            "Media Gallery",
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN:   "bg-blue-100 text-blue-700",
  MANAGER: "bg-sky-100 text-sky-700",
  OWNER:   "bg-amber-100 text-amber-700",
  STAFF:   "bg-slate-100 text-slate-600",
};

function getInitials(name: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── component ──────────────────────────────────────────────────────────────

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const mounted    = useMounted();
  const pathname   = usePathname();
  const router     = useRouter();

  const [hotelName, setHotelName]       = useState<string | null>(null);
  const [userName, setUserName]         = useState<string | null>(null);
  const [role, setRole]                 = useState<string | null>(null);
  const [autoReply, setAutoReply]       = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Read identity from localStorage
  useEffect(() => {
    if (!mounted) return;
    setHotelName(getHotelName());
    setUserName(getUserName());
    setRole(getUserRole());
  }, [mounted]);

  // Fetch unread count + auto-reply status
  useEffect(() => {
    if (!mounted) return;

    apiFetch("/conversations")
      .then((convs: any[]) => {
        setUnreadCount(convs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0));
      })
      .catch(() => {});

    apiFetch("/hotel-settings")
      .then((data: any) => {
        setAutoReply(data?.config?.autoReplyEnabled ?? null);
        // Cache locale settings so formatCurrency / formatDate work globally
        const currency   = data?.config?.currency   ?? "INR";
        const dateFormat = data?.config?.dateFormat  ?? "DD/MM/YYYY";
        const country    = data?.config?.country     ?? "";
        saveLocale(currency, dateFormat, country);
      })
      .catch(() => {});
  }, [mounted]);

  // Live unread count via socket
  useEffect(() => {
    if (!mounted) return;
    const socket = getSocket();

    const onNewMessage = ({ message }: { message: any }) => {
      if (message.direction === "IN") {
        setUnreadCount((n) => n + 1);
      }
    };

    const onRead = () => {
      apiFetch("/conversations")
        .then((convs: any[]) =>
          setUnreadCount(convs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0))
        )
        .catch(() => {});
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:read", onRead);
    };
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const token = localStorage.getItem("TOKEN");
    if (token) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/auth/logout`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } }
      ).catch(() => {});
    }
    resetSocket();
    localStorage.clear();
    router.push("/login");
  }

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";
  const roleStyle = ROLE_STYLES[role ?? ""] ?? ROLE_STYLES.STAFF;

  if (!mounted) return <div className="h-14 border-b border-[#E5E0D4] bg-white" />;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#E5E0D4] bg-white px-5 shadow-sm">

      {/* Left — hamburger (mobile only) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#F4F2ED] md:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[#0C1B33] truncate max-w-32 sm:max-w-none">{pageTitle}</h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <button
          onClick={() => router.push("/dashboard/chats")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-[#F4F2ED]"
          title="Chats"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1B52A8] px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Hotel identity pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#E5E0D4] bg-[#F4F2ED] px-3 py-1.5">
          {/* Auto-reply dot */}
          <span
            title={autoReply === null ? "Loading…" : autoReply ? "Auto-reply ON" : "Auto-reply OFF"}
            className={`h-2 w-2 rounded-full ${
              autoReply === true  ? "bg-emerald-500" :
              autoReply === false ? "bg-slate-400"   : "bg-slate-300"
            }`}
          />
          <span className="max-w-35 truncate text-xs font-semibold text-[#0C1B33]">
            {hotelName ?? "Hotel"}
          </span>
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-[#E5E0D4] bg-[#F4F2ED] py-1 pl-1 pr-3 transition hover:bg-[#E5E0D4]"
          >
            {/* Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B52A8] text-[11px] font-bold text-white">
              {getInitials(userName)}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="max-w-16 sm:max-w-22 truncate text-xs font-medium text-[#0C1B33]">
                {userName ?? "User"}
              </span>
              <span className={`hidden sm:inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleStyle}`}>
                {role}
              </span>
            </div>
            {/* Chevron */}
            <svg
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[#E5E0D4] bg-white shadow-lg overflow-hidden">
              {/* User info */}
              <div className="border-b border-[#F4F2ED] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#0C1B33]">{userName ?? "User"}</p>
                <p className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleStyle}`}>
                  {role}
                </p>
              </div>

              {/* Links */}
              <div className="py-1">
                {role === "ADMIN" && (
                  <button
                    onClick={() => { router.push("/dashboard/configuration"); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#0C1B33] hover:bg-[#F4F2ED] transition"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuration
                  </button>
                )}

                <button
                  onClick={() => { router.push("/dashboard/change-password"); setUserMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#0C1B33] hover:bg-[#F4F2ED] transition"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </button>

                <div className="my-1 border-t border-[#F4F2ED]" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
