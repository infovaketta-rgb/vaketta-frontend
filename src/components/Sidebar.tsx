"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUserRole } from "@/lib/auth";

function NavItem({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-white/10 text-white border-l-2 border-[#B8912E]"
            : "text-white/70 hover:bg-white/8 hover:text-white"
        }`}
      >
        {icon && <span className="w-4 shrink-0 text-center">{icon}</span>}
        {label}
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const role = getUserRole();
  const showBookings = role === "ADMIN" || role === "MANAGER";
  const showAdminLinks = role === "ADMIN";

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-white/8 bg-[#0C1B33] text-white">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/8 px-4">
        <img src="/vchat icon.png" alt="Vaketta" className="h-7 w-7 object-contain" />
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight text-white">Vaketta PMS</p>
          <p className="mt-0.5 text-[10px] text-white/40">Hotel Management</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Main
          </p>
          <ul className="flex flex-col gap-0.5">
            <NavItem href="/dashboard" label="Overview" />
            <NavItem href="/dashboard/chats" label="Chats" />
            {showBookings && <NavItem href="/dashboard/bookings" label="Bookings" />}
          </ul>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Account
          </p>
          <ul className="flex flex-col gap-0.5">
            <NavItem href="/dashboard/subscription" label="Subscription" />
          </ul>
        </div>

        {showAdminLinks && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Administration
            </p>
            <ul className="flex flex-col gap-0.5">
              <NavItem href="/dashboard/bot" label="WhatsApp Bot" />
              <NavItem href="/dashboard/users" label="User Management" />
              <NavItem href="/dashboard/room-types" label="Room Types" />
              <NavItem href="/dashboard/availability" label="Availability" />
              <NavItem href="/dashboard/settings" label="Settings" />
            </ul>
          </div>
        )}
      </nav>

      {/* Help & Support — pinned above gold line, visible to all roles */}
      <div className="px-3 pb-3">
        <NavItem
          href="/dashboard/help"
          label="Help & Support"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Gold accent line at bottom */}
      <div className="h-0.5 bg-linear-to-r from-transparent via-[#B8912E]/40 to-transparent" />
      <div className="h-4 shrink-0" />
    </aside>
  );
}
