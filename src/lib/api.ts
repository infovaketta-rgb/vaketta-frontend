import { logout } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  if (typeof window === "undefined") {
    throw new Error("apiFetch called on server");
  }

  const token = localStorage.getItem("TOKEN");

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NODE_ENV === "development" ? { "ngrok-skip-browser-warning": "true" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      logout();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    if (res.status === 402) {
      let msg = "Subscription has expired";
      try { const b = await res.json(); msg = b.error ?? msg; } catch {}
      // Redirect to subscription page — guarded to prevent infinite reload loop
      if (!window.location.pathname.startsWith("/dashboard/subscription")) {
        window.location.href = "/dashboard/subscription";
      }
      throw new Error(msg);
    }
    let errMsg: string;
    try { const b = await res.json(); errMsg = b.error ?? b.message ?? ""; } catch { errMsg = ""; }
    if (!errMsg) { try { errMsg = await res.text(); } catch {} }
    throw new Error(errMsg || "API request failed");
  }

  return res.json();
}
