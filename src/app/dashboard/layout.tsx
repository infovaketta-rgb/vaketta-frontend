"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSocket } from "@/lib/socket";  // ← add this

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, []);

// ← add this
  useEffect(() => {
    if (!isAuthenticated()) return;
    const socket = getSocket();

    const onStaffNotification = ({ guestName }: { guestName: string }) => {
      if (Notification.permission === "granted") {
        new Notification("💬 Guest needs assistance", {
          body: `${guestName} is waiting for staff support`,
          icon: "/favicon.ico",
        });
      }
    };

    socket.on("staff:notification", onStaffNotification);
    return () => { socket.off("staff:notification", onStaffNotification); };
  }, []);

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
