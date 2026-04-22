"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ToastContainer from "@/components/Toast";
import { useToastStore } from "@/store/toastStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSocket } from "@/lib/socket";  // ← add this


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToastStore();
  const [debugMode, setDebugMode]   = useState(false);
  const [debugLog,  setDebugLog]    = useState<string[]>([]);

  const pushLog = (msg: string) =>
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`]);

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
      pushLog(`backend → ${saveRes.status} ${saveRes.ok ? "✓ saved" : "❌ failed"}`);
    }

    setupPush().catch((err) => pushLog(`❌ error: ${err?.message ?? err}`));
  }, []);

// ← add this
  useEffect(() => {
    if (!isAuthenticated()) return;
    const socket = getSocket();

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

    socket.on("staff:notification", onStaffNotification);
    socket.on("booking:new", onBookingNew);
    return () => {
      socket.off("staff:notification", onStaffNotification);
      socket.off("booking:new", onBookingNew);
    };
  }, []);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      <ToastContainer />
      {debugMode && (
        <div className="fixed bottom-4 left-4 z-9999 w-96 max-h-72 overflow-y-auto rounded-xl border border-slate-300 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Push Debug
          </p>
          {debugLog.length === 0 ? (
            <p className="text-[11px] text-slate-500">waiting…</p>
          ) : (
            debugLog.map((line, i) => (
              <p key={i} className="font-mono text-[11px] leading-relaxed text-slate-200">
                {line}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
