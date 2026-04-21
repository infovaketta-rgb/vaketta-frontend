"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { adminApiFetch } from "@/lib/adminApi";
import { clearAdmin, getAdminName } from "@/lib/adminAuth";

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: "/admin/dashboard", icon: "📊", label: "Dashboard" },
      { href: "/admin/hotels",    icon: "🏨", label: "Hotels" },
      { href: "/admin/leads",     icon: "📥", label: "Leads" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/admin/plans",   icon: "📋", label: "Plans" },
      { href: "/admin/trial",   icon: "🎁", label: "Trial Plan" },
      { href: "/admin/billing", icon: "💰", label: "Revenue" },
    ],
  },
  {
    label: "Bot",
    items: [
      { href: "/admin/flows", icon: "🔀", label: "Flows" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/admins",   icon: "👤", label: "Admins" },
      { href: "/admin/settings", icon: "⚙️", label: "Settings" },
      { href: "/admin/privacy",        icon: "📄", label: "Privacy Policy" },
      { href: "/admin/terms",           icon: "📋", label: "Terms of Service" },
      { href: "/admin/data-deletion",   icon: "🗑️", label: "Data Deletion" },
    ],
  },
];

function AdminSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => { setAdminName(getAdminName()); }, []);

  async function handleLogout() {
    try { await adminApiFetch("/admin/logout", { method: "POST" }); } catch {}
    clearAdmin();
    router.replace("/admin/login");
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-[#0C1B33]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-5">
        <img src="/vakettaVlogo.png" alt="Vaketta" className="h-8 w-8 object-contain" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Vaketta</p>
          <p className="text-sm font-bold leading-none text-white">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label ?? "main"}>
            {section.label && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-white/28">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, icon, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-white/12 font-semibold text-white border-l-2 border-[#B8912E]"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="w-4 text-center">{icon}</span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/8 px-4 py-4">
        {adminName && (
          <p className="mb-2 truncate text-xs text-white/40">{adminName}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/65 transition hover:bg-red-500/20 hover:text-red-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>

      {/* Gold accent bottom line */}
      <div className="h-0.5 bg-linear-to-r from-transparent via-[#B8912E]/40 to-transparent" />
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    adminApiFetch("/admin/me")
      .then(() => setChecking(false))
      .catch(() => router.replace("/admin/login"));
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0C1B33]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#B8912E]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#F4F2ED]">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
