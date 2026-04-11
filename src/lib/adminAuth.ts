/**
 * Admin auth helpers.
 * The actual JWT is stored in an httpOnly cookie (not accessible from JS).
 * We only store the admin's display name in localStorage for UI purposes.
 */
const NAME_KEY = "VAKETTA_ADMIN_NAME";

export function saveAdminName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getAdminName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function clearAdmin(): void {
  localStorage.removeItem(NAME_KEY);
}
