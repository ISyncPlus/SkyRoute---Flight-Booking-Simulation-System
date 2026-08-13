/**
 * Presentation helpers shared across the UI.
 * Pure functions, so they are unit-testable alongside the business logic.
 */

import type { Airport, CabinClass } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "14:35" */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/** "Mon, 12 August 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Mon, 12 Aug" */
export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

/** 135 -> "2h 15m" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

/** YYYY-MM-DD for an offset from today, for date inputs. */
export function dateInputValue(offsetDays = 0, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + offsetDays);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "Lagos (LOS)" */
export function airportLabel(airport: Airport | undefined): string {
  if (!airport) return "Unknown";
  return `${airport.city} (${airport.code})`;
}

export const CABIN_NAMES: Record<CabinClass, string> = {
  economy: "Economy",
  business: "Business",
  first: "First Class",
};

/** True when the two airports are in different countries. */
export function isInternational(origin: Airport | undefined, destination: Airport | undefined): boolean {
  if (!origin || !destination) return false;
  return origin.country !== destination.country;
}
