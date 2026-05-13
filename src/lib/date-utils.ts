import { format } from "date-fns";

/**
 * Converts a Date to "YYYY-MM-DD" using LOCAL timezone.
 * Safe for Supabase date column queries on all devices/timezones.
 * Never use date.toISOString().slice(0,10) — it uses UTC and shifts
 * the date on devices with UTC+ offset (e.g. Ukraine UTC+2/UTC+3).
 */
export function toLocalDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parses a "YYYY-MM-DD" string as a LOCAL date (not UTC).
 * Safe alternative to new Date("YYYY-MM-DD").
 */
export function fromLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
