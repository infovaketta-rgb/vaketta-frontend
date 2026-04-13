export type PaginatedResponse<T> = {
  data?: T[];
  hotels?: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

/**
 * API client for Vaketta admin routes (/admin/*).
 * Auth is via httpOnly cookie `vaketta_token` — no manual token handling needed.
 * Automatically redirects to /admin/login on 401.
 */
export async function adminApiFetch(path: string, options?: RequestInit): Promise<any> {
  if (typeof window === "undefined") throw new Error("adminApiFetch called on server");

  const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include", // send httpOnly cookie
    headers,
  });

  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? res.statusText);
  }

  return res.json();
}
