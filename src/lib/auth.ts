import { resetSocket } from "./socket";
import { useChatStore } from "../store/chatStore";

export function saveToken(token: string) {
  localStorage.setItem("TOKEN", token);
}

export function getToken() {
  return localStorage.getItem("TOKEN");
}

/**
 * Clear auth credentials and optionally navigate before resetting the Zustand
 * store. Passing `navigate` defers the store reset to the next microtask so
 * React effects on the outgoing page don't re-subscribe with empty auth state
 * before routing completes. Without `navigate` (e.g. on a hard 401 redirect)
 * the store is reset synchronously — the subsequent full-page reload discards
 * it anyway.
 */
export function logout(navigate?: () => void) {
  resetSocket();
  localStorage.removeItem("TOKEN");
  localStorage.removeItem("USER_ROLE");
  localStorage.removeItem("HOTEL_ID");
  localStorage.removeItem("HOTEL_API_KEY");
  localStorage.removeItem("HOTEL_NAME");
  localStorage.removeItem("USER_NAME");
  localStorage.removeItem("USER_EMAIL");
  if (navigate) {
    navigate();
    // Defer Zustand reset so the router can commit the navigation before
    // components re-render with empty store state.
    setTimeout(() => useChatStore.getState().resetStore(), 0);
  } else {
    useChatStore.getState().resetStore();
  }
}

export function getUserRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("USER_ROLE");
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("TOKEN");
}

export function saveHotelName(name: string) {
  localStorage.setItem("HOTEL_NAME", name);
}

export function getHotelName() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("HOTEL_NAME");
}

export function saveUserName(name: string) {
  localStorage.setItem("USER_NAME", name);
}

export function getUserName() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("USER_NAME");
}

export function saveUserEmail(email: string) {
  localStorage.setItem("USER_EMAIL", email);
}

export function getUserEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("USER_EMAIL");
}
