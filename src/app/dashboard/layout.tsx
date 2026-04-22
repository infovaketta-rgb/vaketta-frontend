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
