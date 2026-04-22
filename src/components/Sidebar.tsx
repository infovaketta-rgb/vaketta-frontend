"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getUserRole } from "@/lib/auth";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function NavItem({
  href, label, icon, onClick,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
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

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const role = getUserRole();
  const showBookings  = role === "ADMIN" || role === "MANAGER";
  const showAdminLinks = role === "ADMIN";

  return (
    <>
      {/* Mobile overlay — tap outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel — fixed on mobile, relative on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col
          border-r border-white/8 bg-[#0C1B33] text-white
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/8 px-4">
          <Image src="/vchat icon.png" alt="Vaketta" width={28} height={28} className="object-contain" priority />
          <div>
            <p className="text-sm font-semibold leading-none tracking-tight text-white">Vaketta Chat</p>
            <p className="mt-0.5 text-[10px] text-white/40">Hotel Automation</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Main
            </p>
            <ul className="flex flex-col gap-0.5">
              <NavItem href="/dashboard"          label="Overview"  onClick={onClose} />
              <NavItem href="/dashboard/chats"    label="Chats"     onClick={onClose} />
              {showBookings && <NavItem href="/dashboard/bookings" label="Bookings" onClick={onClose} />}
            </ul>
          </div>

          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Account
            </p>
            <ul className="flex flex-col gap-0.5">
              <NavItem href="/dashboard/subscription" label="Subscription" onClick={onClose} />
            </ul>
          </div>

          {showAdminLinks && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Administration
              </p>
              <ul className="flex flex-col gap-0.5">
                <NavItem href="/dashboard/bot"          label="WhatsApp Bot"    onClick={onClose} />
                <NavItem href="/dashboard/users"        label="User Management" onClick={onClose} />
                <NavItem href="/dashboard/room-types"   label="Room Types"      onClick={onClose} />
                <NavItem href="/dashboard/availability" label="Availability"    onClick={onClose} />
                <NavItem href="/dashboard/settings"     label="Settings"        onClick={onClose} />
              </ul>
            </div>
          )}
        </nav>

        {/* Help & Support */}
        <div className="px-3 pb-3">
          <NavItem
            href="/dashboard/help"
            label="Help & Support"
            onClick={onClose}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Gold accent line */}
        <div className="h-0.5 bg-linear-to-r from-transparent via-[#B8912E]/40 to-transparent" />
        <div className="h-4 shrink-0" />
      </aside>
    </>
  );
}
