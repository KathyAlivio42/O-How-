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

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function resolveDateRange(
  key: DateRangeKey,
  custom?: { start: string; end: string }
): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (key) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "yesterday":
      return { start: addDays(today, -1), end: today };
    case "this_week": {
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const start = addDays(today, -dayOfWeek);
      return { start, end: addDays(today, 1) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: addDays(today, 1) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }
    case "last_7_days":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "last_30_days":
      return { start: addDays(today, -29), end: addDays(today, 1) };
    case "custom":
      if (!custom) throw new Error("Custom range requires start/end.");
      return {
        start: startOfDay(new Date(custom.start)),
        end: addDays(startOfDay(new Date(custom.end)), 1),
      };
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
