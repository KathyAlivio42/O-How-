// Philippine Standard Time is UTC+8 year-round — the Philippines does not
// observe daylight saving time, so this offset never changes. That fixed
// offset is what makes the math below safe to hard-code rather than needing
// a timezone database lookup for DST transitions.
//
// WHY THIS FILE EXISTS: a plain `new Date()` combined with `.setHours()`,
// `.getHours()`, or `.toLocaleTimeString()` all operate in whatever
// timezone the *running process* is configured for -- the server's on
// Vercel (which defaults to UTC), or the visitor's device in the browser
// (which could be anything if their phone's clock/region is set wrong, or
// they're traveling). Since this is a single-location Philippines shop,
// every "what time is it for the shop" calculation needs to be pinned to
// Asia/Manila explicitly, not inferred from wherever the code happens to
// execute. `Intl.DateTimeFormat` with an explicit `timeZone` is the one
// primitive that reliably does this regardless of runtime environment.

export const MANILA_TZ = "Asia/Manila";
const MANILA_UTC_OFFSET_HOURS = 8;

interface ManilaParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

/** Breaks a UTC instant into its Philippine wall-clock date/time components. */
export function getManilaParts(date: Date): ManilaParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  // Some locales render midnight as "24" with hour12: false.
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Builds the UTC instant corresponding to a given Philippine wall-clock
 * date/time. E.g. (2026, 1, 15, 10, 0) -> the UTC instant that is
 * 10:00 AM in Manila on Jan 15, 2026. */
export function manilaDateTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - MANILA_UTC_OFFSET_HOURS, minute, 0, 0));
}

/** The UTC instant representing 00:00:00 Philippine time on the Manila
 * calendar date containing `date` (defaults to now). Use this instead of
 * `new Date().setHours(0,0,0,0)` for any "start of today" boundary that
 * must match the shop's actual day, not the server process's timezone. */
export function startOfManilaDayUTC(date: Date = new Date()): Date {
  const { year, month, day } = getManilaParts(date);
  return manilaDateTimeToUTC(year, month, day, 0, 0);
}

export function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Formats a UTC instant as a Philippine-time clock string, e.g. "3:00 PM". */
export function formatManilaTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Formats a UTC instant as a short Philippine-time date, e.g. "Jan 15". */
export function formatManilaShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Formats a UTC instant as "Month Year" in Philippine time, e.g. "January 2026". */
export function formatManilaMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function isSameManilaDay(a: Date, b: Date): boolean {
  const pa = getManilaParts(a);
  const pb = getManilaParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}
