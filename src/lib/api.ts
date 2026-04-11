const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
    const text = await res.text();
    throw new Error(text || "API request failed");
  }

  return res.json();
}
