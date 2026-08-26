import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a GEL price for display, e.g. 1249 -> "1 249 ₾".
 * Implemented manually (no Intl.NumberFormat) so server and client render
 * identically regardless of the Node ICU build available at runtime.
 */
export function formatPrice(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [intPart, fracPart] = Math.abs(rounded).toFixed(rounded % 1 === 0 ? 0 : 2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${grouped}${fracPart ? `.${fracPart}` : ""} ₾`;
}

/** Percentage discount between an original and current price, rounded down. */
export function getDiscountPercent(current: number, previous?: number): number | null {
  if (!previous || previous <= current) return null;
  return Math.round(((previous - current) / previous) * 100);
}

const georgianMonths = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

/** Georgia is UTC+4 year-round; used so SSR and the browser format the same calendar day. */
const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Human-readable Georgian date, e.g. 25 აგვისტო 2026. Manual (no Intl) so server and client always agree. */
export function formatGeorgianDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp + TBILISI_OFFSET_MS);
  const month = georgianMonths[date.getUTCMonth()];
  if (!month) return "";
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}
