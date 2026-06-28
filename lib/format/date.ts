export function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromDateInputValue(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const [, y, m, day] = match;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(locale: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    dateFormatters.set(locale, f);
  }
  return f;
}

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();
function weekdayFormatter(locale: string): Intl.DateTimeFormat {
  let f = weekdayFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { weekday: "long" });
    weekdayFormatters.set(locale, f);
  }
  return f;
}

export function formatDate(d: Date, locale: string = "en-IN"): string {
  return dateFormatter(locale).format(d);
}

export function formatDateRelative(d: Date, locale: string = "en-IN"): string {
  const today = todayUtc();
  const diffMs = utcMidnight(d).getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > -7 && diffDays < 0) {
    return weekdayFormatter(locale).format(d);
  }
  return formatDate(d, locale);
}

export function startOfMonthUtc(ref: Date = new Date()): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
}

export function endOfMonthUtc(ref: Date = new Date()): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
}

export function daysAgoUtc(days: number, ref: Date = new Date()): Date {
  const base = utcMidnight(ref);
  return new Date(base.getTime() - days * 86_400_000);
}
