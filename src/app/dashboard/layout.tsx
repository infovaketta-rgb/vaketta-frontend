"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ToastContainer from "@/components/Toast";
import { useToastStore } from "@/store/toastStore";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { HotelSocketProvider, useSocket } from "@/context/SocketContext";


function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const socket = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToastStore();
  const [debugMode, setDebugMode]   = useState(false);
  const [debugLog,  setDebugLog]    = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // History sync banner state
  const [syncBanner, setSyncBanner] = useState<{
    status:   "in_progress" | "complete";
    progress: number;
  } | null>(null);
  const syncDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushLog = (msg: string) =>
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debugLog]);

  useEffect(() => {
    if (window.location.search.includes("debug=push")) setDebugMode(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      pushLog("❌ ServiceWorker or PushManager not supported");
      return;
    }

    async function setupPush() {
      pushLog("▶ requesting notification permission…");
      const permission = await Notification.requestPermission();
      pushLog(`permission → ${permission}`);
      if (permission !== "granted") return;

      pushLog("▶ registering /sw.js…");
      const reg = await navigator.serviceWorker.register("/sw.js");
      pushLog(`SW scope: ${reg.scope}`);

      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        pushLog("✓ already subscribed — skipping subscribe()");
      } else {
        pushLog("▶ fetching VAPID public key…");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/push/vapid-public-key`);
        pushLog(`VAPID fetch → ${res.status}`);
        if (!res.ok) { pushLog("❌ VAPID key unavailable — push disabled"); return; }
        const { key } = await res.json();
        pushLog(`key prefix: ${key.slice(0, 12)}…`);

        pushLog("▶ calling pushManager.subscribe()…");
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        pushLog(`✓ subscribed — endpoint: …${sub.endpoint.slice(-20)}`);
      }

      const token = localStorage.getItem("TOKEN");
      if (!token) { pushLog("❌ no TOKEN in localStorage — skipping backend register"); return; }

      pushLog("▶ POST /push/subscribe to backend…");
      const saveRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/push/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(sub.toJSON()),
      });
      if (saveRes.ok) {
        pushLog(`✅ subscription saved (${saveRes.status})`);
      } else {
        const body = await saveRes.text().catch(() => "");
        pushLog(`❌ backend error ${saveRes.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
      }
    }

    setupPush().catch((err) => pushLog(`❌ error: ${err?.message ?? err}`));
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !socket) return;

    const onStaffNotification = ({ guestName }: { guestName: string }) => {
      if (Notification.permission === "granted") {
        new Notification("💬 Guest needs assistance", {
          body: `${guestName} is waiting for staff support`,
          icon: "/vchat icon.png",
        });
      }
    };

    const onBookingNew = ({ booking }: { booking: any }) => {
      addToast(`New booking from ${booking.guestName}`, "success");
    };

    const onHistorySync = ({ progress, status }: { progress: number; status: string }) => {
      setSyncBanner({ progress, status: status as "in_progress" | "complete" });
      if (status === "complete") {
        if (syncDismissRef.current) clearTimeout(syncDismissRef.current);
        syncDismissRef.current = setTimeout(() => setSyncBanner(null), 3000);
      }
    };

    socket.on("staff:notification", onStaffNotification);
    socket.on("booking:new", onBookingNew);
    socket.on("history:sync_progress", onHistorySync);
    return () => {
      socket.off("staff:notification", onStaffNotification);
      socket.off("booking:new", onBookingNew);
      socket.off("history:sync_progress", onHistorySync);
    };
  }, [socket]);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* WhatsApp Coexistence history sync banner */}
          {syncBanner && (
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all ${
                syncBanner.status === "complete"
                  ? "bg-emerald-50 text-emerald-700 border-b border-emerald-100"
                  : "bg-[#7A3F91]/8 text-[#7A3F91] border-b border-[#7A3F91]/12"
              }`}
            >
              {syncBanner.status === "in_progress" ? (
                <>
                  <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>
                    Importing your WhatsApp chat history&hellip;
                    <span className="ml-1 font-semibold">{syncBanner.progress}%</span>
                  </span>
                  <div className="ml-2 flex-1 max-w-48 h-1.5 rounded-full bg-[#7A3F91]/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7A3F91] transition-all duration-500"
                      style={{ width: `${syncBanner.progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Chat history import complete!
                </>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
      <ToastContainer />
      {debugMode && (
        <div className="fixed bottom-4 left-4 z-9999 w-80 rounded-xl border border-slate-600 bg-slate-900/95 shadow-2xl backdrop-blur">
          <p className="border-b border-slate-700 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Push Debug
          </p>
          <div className="max-h-48 overflow-y-auto px-3 py-2">
            {debugLog.length === 0 ? (
              <p className="text-[11px] text-slate-500">waiting…</p>
            ) : (
              debugLog.map((line, i) => (
                <p key={i} className={`font-mono text-[11px] leading-relaxed ${line.includes("❌") ? "text-red-400" : line.includes("✅") ? "text-emerald-400" : "text-slate-200"}`}>
                  {line}
                </p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <HotelSocketProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </HotelSocketProvider>
  );
}
