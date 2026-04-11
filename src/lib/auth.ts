export function saveToken(token: string) {
  localStorage.setItem("TOKEN", token);
}

export function getToken() {
  return localStorage.getItem("TOKEN");
}

export function logout() {
  localStorage.removeItem("TOKEN");
  localStorage.removeItem("USER_ROLE");
  localStorage.removeItem("HOTEL_ID");
  localStorage.removeItem("HOTEL_API_KEY");
  localStorage.removeItem("HOTEL_NAME");
  localStorage.removeItem("USER_NAME");
  localStorage.removeItem("USER_EMAIL");
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
