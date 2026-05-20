"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { getSocket, resetSocket, getAdminSocket, resetAdminSocket } from "@/lib/socket";
import { adminApiFetch } from "@/lib/adminApi";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

// ── Hotel staff socket (auth via HOTEL_API_KEY) ───────────────────────────────

export function HotelSocketProvider({ children }: { children: ReactNode }) {
  const [sock, setSock] = useState<Socket | null>(null);

  useEffect(() => {
    try {
      const s = getSocket();
      setSock(s);
    } catch {
      // API key not set yet — socket will be unavailable
    }
    return () => {
      resetSocket();
    };
  }, []);

  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
}

// ── Vaketta admin socket (auth via short-lived socket token) ──────────────────

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  const [sock, setSock] = useState<Socket | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    adminApiFetch("/admin/socket-token")
      .then((res: any) => {
        const s = getAdminSocket(res.token);
        setSock(s);
      })
      .catch(() => {
        // Not logged in or token fetch failed — socket stays null
      });

    return () => {
      resetAdminSocket();
    };
  }, []);

  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
}
