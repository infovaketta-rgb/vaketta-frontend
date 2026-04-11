/**
 * Locale utilities — currency symbols and date formatting for the hotel dashboard.
 * Settings are saved per-hotel by the admin and cached in localStorage.
 */

// ── Country options ───────────────────────────────────────────────────────────

export type CountryOption = {
  code:     string;
  label:    string;
  flag:     string;
  currency: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: "IN", label: "India",           flag: "🇮🇳", currency: "INR" },
  { code: "US", label: "United States",   flag: "🇺🇸", currency: "USD" },
  { code: "GB", label: "United Kingdom",  flag: "🇬🇧", currency: "GBP" },
  { code: "AE", label: "UAE",             flag: "🇦🇪", currency: "AED" },
  { code: "SG", label: "Singapore",       flag: "🇸🇬", currency: "SGD" },
  { code: "MY", label: "Malaysia",        flag: "🇲🇾", currency: "MYR" },
  { code: "TH", label: "Thailand",        flag: "🇹🇭", currency: "THB" },
  { code: "AU", label: "Australia",       flag: "🇦🇺", currency: "AUD" },
  { code: "CA", label: "Canada",          flag: "🇨🇦", currency: "CAD" },
  { code: "JP", label: "Japan",           flag: "🇯🇵", currency: "JPY" },
  { code: "SA", label: "Saudi Arabia",    flag: "🇸🇦", currency: "SAR" },
  { code: "QA", label: "Qatar",           flag: "🇶🇦", currency: "QAR" },
  { code: "ID", label: "Indonesia",       flag: "🇮🇩", currency: "IDR" },
  { code: "PH", label: "Philippines",     flag: "🇵🇭", currency: "PHP" },
  { code: "LK", label: "Sri Lanka",       flag: "🇱🇰", currency: "LKR" },
  { code: "NP", label: "Nepal",           flag: "🇳🇵", currency: "NPR" },
  { code: "EU", label: "Europe",          flag: "🇪🇺", currency: "EUR" },
];

// ── Currency options ──────────────────────────────────────────────────────────

export type CurrencyOption = {
  code:   string;
  symbol: string;
  label:  string;
};

export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹",    label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$",    label: "US Dollar ($)" },
  { code: "EUR", symbol: "€",    label: "Euro (€)" },
  { code: "GBP", symbol: "£",    label: "British Pound (£)" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (د.إ)" },
  { code: "SGD", symbol: "S$",   label: "Singapore Dollar (S$)" },
  { code: "MYR", symbol: "RM",   label: "Malaysian Ringgit (RM)" },
  { code: "THB", symbol: "฿",    label: "Thai Baht (฿)" },
  { code: "AUD", symbol: "A$",   label: "Australian Dollar (A$)" },
  { code: "CAD", symbol: "C$",   label: "Canadian Dollar (C$)" },
  { code: "JPY", symbol: "¥",    label: "Japanese Yen (¥)" },
  { code: "CNY", symbol: "¥",    label: "Chinese Yuan (¥)" },
  { code: "CHF", symbol: "Fr",   label: "Swiss Franc (Fr)" },
  { code: "HKD", symbol: "HK$",  label: "Hong Kong Dollar (HK$)" },
  { code: "SAR", symbol: "﷼",    label: "Saudi Riyal (﷼)" },
  { code: "QAR", symbol: "QR",   label: "Qatari Riyal (QR)" },
  { code: "IDR", symbol: "Rp",   label: "Indonesian Rupiah (Rp)" },
  { code: "PHP", symbol: "₱",    label: "Philippine Peso (₱)" },
  { code: "LKR", symbol: "Rs",   label: "Sri Lankan Rupee (Rs)" },
  { code: "NPR", symbol: "रू",   label: "Nepalese Rupee (रू)" },
];

// ── Date format options ───────────────────────────────────────────────────────

export type DateFormatOption = {
  value:   string;
  label:   string;
  example: string;
};

export const DATE_FORMATS: DateFormatOption[] = [
  { value: "DD/MM/YYYY",  label: "DD/MM/YYYY",          example: "25/12/2024" },
  { value: "MM/DD/YYYY",  label: "MM/DD/YYYY",          example: "12/25/2024" },
  { value: "YYYY-MM-DD",  label: "YYYY-MM-DD (ISO)",    example: "2024-12-25" },
  { value: "DD-MM-YYYY",  label: "DD-MM-YYYY",          example: "25-12-2024" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY",         example: "25 Dec 2024" },
  { value: "MMM DD, YYYY",label: "MMM DD, YYYY",        example: "Dec 25, 2024" },
  { value: "D MMMM YYYY", label: "D MMMM YYYY (long)",  example: "25 December 2024" },
];

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS_CURRENCY    = "HOTEL_CURRENCY";
const LS_DATE_FORMAT = "HOTEL_DATE_FORMAT";
const LS_COUNTRY     = "HOTEL_COUNTRY";

export function saveLocale(currency: string, dateFormat: string, country?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_CURRENCY,    currency);
  localStorage.setItem(LS_DATE_FORMAT, dateFormat);
  if (country) localStorage.setItem(LS_COUNTRY, country);
}

function getStoredCurrency(): string {
  if (typeof window === "undefined") return "INR";
  return localStorage.getItem(LS_CURRENCY) ?? "INR";
}

function getStoredDateFormat(): string {
  if (typeof window === "undefined") return "DD/MM/YYYY";
  return localStorage.getItem(LS_DATE_FORMAT) ?? "DD/MM/YYYY";
}

export function getStoredCountry(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_COUNTRY) ?? "";
}

// ── Formatting functions ──────────────────────────────────────────────────────

export function getCurrencySymbol(code?: string | null): string {
  const c = CURRENCIES.find((x) => x.code === (code ?? getStoredCurrency()));
  return c?.symbol ?? "₹";
}

/**
 * Format a numeric amount with the hotel's currency symbol.
 * Uses localStorage if currencyCode is not provided.
 */
export function formatCurrency(amount: number, currencyCode?: string | null): string {
  const symbol = getCurrencySymbol(currencyCode ?? getStoredCurrency());
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Format an ISO date string using the hotel's configured date format.
 * Uses localStorage if dateFormat is not provided.
 */
export function formatDate(iso: string, dateFormat?: string | null): string {
  const fmt = dateFormat ?? getStoredDateFormat();
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const day2   = String(d.getDate()).padStart(2, "0");
  const day    = String(d.getDate());
  const month2 = String(d.getMonth() + 1).padStart(2, "0");
  const year   = String(d.getFullYear());

  const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const LONG_MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthShort = SHORT_MONTHS[d.getMonth()];
  const monthLong  = LONG_MONTHS[d.getMonth()];

  switch (fmt) {
    case "MM/DD/YYYY":  return `${month2}/${day2}/${year}`;
    case "YYYY-MM-DD":  return `${year}-${month2}-${day2}`;
    case "DD-MM-YYYY":  return `${day2}-${month2}-${year}`;
    case "DD MMM YYYY": return `${day2} ${monthShort} ${year}`;
    case "MMM DD, YYYY":return `${monthShort} ${day2}, ${year}`;
    case "D MMMM YYYY": return `${day} ${monthLong} ${year}`;
    default:            return `${day2}/${month2}/${year}`; // DD/MM/YYYY
  }
}
