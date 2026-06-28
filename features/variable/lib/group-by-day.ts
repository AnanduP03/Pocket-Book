import type { PlainVariable } from "@/db/repositories/variable";

export type DayGroup = {
  /** ISO yyyy-mm-dd of the day in UTC — stable React key. */
  dateKey: string;
  /** Display label: TODAY / YESTERDAY / weekday name / numeric date. */
  label: string;
  items: PlainVariable[];
};

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Bucket variable items by UTC day, preserving input order both for the
 * groups themselves (callers pre-sort) and for the items inside each
 * group. Labels follow the rule:
 *
 *   - 0 days ago → "TODAY"
 *   - 1 day ago  → "YESTERDAY"
 *   - 2-6 days ago → named weekday in the user's locale
 *   - 7+ days ago → numeric date in the user's locale
 *
 * `now` is parameterized for testability.
 */
export function groupByDay(
  items: PlainVariable[],
  locale: string,
  now: Date = new Date(),
): DayGroup[] {
  if (items.length === 0) return [];

  const todayKey = utcDayKey(now);
  const yesterdayKey = utcDayKey(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)),
  );
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const numericFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });

  const order: string[] = [];
  const map = new Map<string, DayGroup>();

  for (const item of items) {
    const d = new Date(item.date);
    const key = utcDayKey(d);
    let group = map.get(key);
    if (!group) {
      let label: string;
      if (key === todayKey) {
        label = "TODAY";
      } else if (key === yesterdayKey) {
        label = "YESTERDAY";
      } else {
        const dayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        const daysAgo = Math.round((todayMs - dayMs) / 86_400_000);
        label = daysAgo >= 2 && daysAgo <= 6 ? weekdayFmt.format(d) : numericFmt.format(d);
      }
      group = { dateKey: key, label, items: [] };
      map.set(key, group);
      order.push(key);
    }
    group.items.push(item);
  }

  return order.map((k) => map.get(k)!);
}
