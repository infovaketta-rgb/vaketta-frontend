"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ToastContainer from "@/components/Toast";
import { useToastStore } from "@/store/toastStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSocket } from "@/lib/socket";  // ← add this

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setupPush() {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/push/vapid-public-key`);
        if (!res.ok) return;
        const { key } = await res.json();
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const token = localStorage.getItem("TOKEN");
      if (!token) return;
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/push/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(sub.toJSON()),
      });
    }

    setupPush().catch(() => {});
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
    </div>
  );
}
