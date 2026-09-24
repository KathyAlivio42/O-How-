import { getManilaParts, manilaDateTimeToUTC, startOfManilaDayUTC, addDaysUTC } from "@/lib/manila-time";

export type DateRangeKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_7_days"
  | "last_30_days"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date; // exclusive
}

/** Day of week (0=Sunday) for a Manila calendar date. Constructing via
 * Date.UTC and reading getUTCDay() back out is timezone-independent once
 * we already have the correct Y/M/D -- it's just calendar math from there. */
function manilaDayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function resolveDateRange(
  key: DateRangeKey,
  custom?: { start: string; end: string }
): DateRange {
  const now = new Date();
  const today = startOfManilaDayUTC(now); // UTC instant = Manila midnight today
  const { year, month, day } = getManilaParts(now);

  switch (key) {
    case "today":
      return { start: today, end: addDaysUTC(today, 1) };
    case "yesterday":
      return { start: addDaysUTC(today, -1), end: today };
    case "this_week": {
      const dow = manilaDayOfWeek(year, month, day); // 0 = Sunday
      return { start: addDaysUTC(today, -dow), end: addDaysUTC(today, 1) };
    }
    case "this_month": {
      const start = manilaDateTimeToUTC(year, month, 1, 0, 0);
      return { start, end: addDaysUTC(today, 1) };
    }
    case "last_month": {
      // Month 0 rolls back to December of the previous year automatically
      // via Date.UTC's own normalization inside manilaDateTimeToUTC.
      const start = manilaDateTimeToUTC(year, month - 1, 1, 0, 0);
      const end = manilaDateTimeToUTC(year, month, 1, 0, 0);
      return { start, end };
    }
    case "last_7_days":
      return { start: addDaysUTC(today, -6), end: addDaysUTC(today, 1) };
    case "last_30_days":
      return { start: addDaysUTC(today, -29), end: addDaysUTC(today, 1) };
    case "custom": {
      if (!custom) throw new Error("Custom range requires start/end.");
      // Date inputs give plain "YYYY-MM-DD" strings with no time component --
      // parse the parts directly and treat them as Manila calendar dates
      // (what the admin actually means), rather than letting `new Date(...)`
      // interpret the string as UTC midnight, which can silently shift the
      // range by a day depending on the runtime's timezone.
      const [sy, sm, sd] = custom.start.split("-").map(Number);
      const [ey, em, ed] = custom.end.split("-").map(Number);
      return {
        start: manilaDateTimeToUTC(sy!, sm!, sd!, 0, 0),
        end: addDaysUTC(manilaDateTimeToUTC(ey!, em!, ed!, 0, 0), 1),
      };
    }
  }
}

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  last_7_days: "Last 7 Days",
  last_30_days: "Last 30 Days",
  custom: "Custom Range",
};
