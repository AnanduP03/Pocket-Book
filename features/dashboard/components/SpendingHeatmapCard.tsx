"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format/money";
import { useDashboardCharts } from "../hooks/useDashboardCharts";
import type { PlainCategory } from "@/db/repositories/categories";
import type { MonthlyDailySpend } from "../queries";

type Props = {
  categories: PlainCategory[];
  currency: string;
  locale: string;
};

const WEEKDAY_FORMATS: Record<string, Intl.DateTimeFormat> = {};
function weekdayShort(date: Date, locale: string): string {
  const f =
    WEEKDAY_FORMATS[locale] ??
    (WEEKDAY_FORMATS[locale] = new Intl.DateTimeFormat(locale, {
      weekday: "narrow",
    }));
  return f.format(date);
}

function intensityClass(ratio: number): string {
  if (ratio <= 0) return "bg-(--surface-2)/60";
  if (ratio < 0.2) return "bg-(--accent)/25";
  if (ratio < 0.4) return "bg-(--accent)/45";
  if (ratio < 0.6) return "bg-(--accent)/65";
  if (ratio < 0.8) return "bg-(--accent)/80";
  return "bg-(--accent)";
}

export function SpendingHeatmapCard({
  categories,
  currency,
  locale,
}: Props) {
  const { data: charts, isLoading } = useDashboardCharts();
  const dailySpend = charts?.dailySpend ?? [];
  const lastIndex = Math.max(0, dailySpend.length - 1);
  // Offset from "current month": 0 = current, 1 = one month back, ...
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const safeIndex = Math.max(0, lastIndex - monthOffset);
  const month = dailySpend[safeIndex];
  const isCurrentMonth = monthOffset === 0;
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const dayMap = useMemo(() => {
    const m = new Map<string, MonthlyDailySpend["days"][number]>();
    if (!month) return m;
    for (const d of month.days) m.set(d.date, d);
    return m;
  }, [month]);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [locale],
  );

  const selectedDay = selectedDate ? dayMap.get(selectedDate) ?? null : null;

  const weekdayHeaders = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2024, 0, 1 + i));
      out.push(weekdayShort(d, locale));
    }
    return out;
  }, [locale]);

  if (isLoading && dailySpend.length === 0) {
    return <Skeleton className="h-[420px] w-full" />;
  }

  if (!month) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeader>
          <CardTitle>Spending calendar</CardTitle>
        </CardHeader>
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-4 text-center text-xs text-(--muted)">
          A whole month, fresh and unwritten. Log an expense and the
          calendar lights up.
        </div>
      </Card>
    );
  }

  const firstDay = new Date(Date.UTC(month.year, month.month, 1));
  const firstWeekdaySun = firstDay.getUTCDay();
  const leadingBlanks = (firstWeekdaySun + 6) % 7;
  const monthLabel = monthFormatter.format(firstDay);

  const cells: Array<
    | { kind: "blank"; key: string }
    | {
        kind: "day";
        key: string;
        dayNum: number;
        date: string;
        totalPaise: number;
        ratio: number;
        scheduledOnly: boolean;
      }
  > = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ kind: "blank", key: `b${i}` });
  }
  for (let day = 1; day <= month.daysInMonth; day++) {
    const date = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const detail = dayMap.get(date);
    const total = detail?.totalPaise ?? 0;
    const ratio = month.maxDayPaise > 0 ? total / month.maxDayPaise : 0;
    const scheduledOnly = !!detail
      && detail.variableItems.length === 0
      && detail.fixedItems.length > 0
      && detail.fixedItems.every((f) => f.kind === "scheduled");
    cells.push({
      kind: "day",
      key: date,
      dayNum: day,
      date,
      totalPaise: total,
      ratio,
      scheduledOnly,
    });
  }

  const goPrev = () => {
    setMonthOffset((o) => Math.min(lastIndex, o + 1));
    setSelectedDate(null);
  };
  const goNext = () => {
    setMonthOffset((o) => Math.max(0, o - 1));
    setSelectedDate(null);
  };
  const goCurrent = () => {
    setMonthOffset(0);
    setSelectedDate(null);
  };

  const formatCellDate = (date: string): string => {
    const [y, m, d] = date.split("-").map(Number);
    return dayFormatter.format(new Date(Date.UTC(y!, m! - 1, d!)));
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>Spending calendar</CardTitle>
          <CardDescription>
            Total {formatCurrency(month.totalPaise, currency, locale)}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              disabled={monthOffset >= lastIndex}
              onClick={goPrev}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-[110px] text-center text-sm font-medium tabular-nums text-(--text)">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next month"
              disabled={monthOffset === 0}
              onClick={goNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            {!isCurrentMonth ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={goCurrent}
              >
                Jump to current
              </Button>
            ) : null}
          </div>

          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-(--muted)">
              {weekdayHeaders.map((w, i) => (
                <span key={`${w}-${i}`}>{w}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((c) => {
                if (c.kind === "blank") {
                  return <div key={c.key} aria-hidden />;
                }
                const isSelected = selectedDate === c.date;
                const hasSpend = c.totalPaise > 0;
                const cellLabel = hasSpend
                  ? `${formatCellDate(c.date)}, ${formatCurrency(c.totalPaise, currency, locale)}${c.scheduledOnly ? " scheduled" : ""}`
                  : `${formatCellDate(c.date)}, no activity`;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      const next = isSelected ? null : c.date;
                      setSelectedDate(next);
                      if (next && typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
                        // On phones the detail panel renders below the calendar.
                        // Scroll it into view so the user sees the breakdown without
                        // hunting for it after tapping.
                        requestAnimationFrame(() => {
                          detailRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        });
                      }
                    }}
                    aria-pressed={isSelected}
                    aria-label={cellLabel}
                    title={cellLabel}
                    className={cn(
                      "relative aspect-square min-h-[40px] sm:min-h-[36px] rounded-[var(--radius-input)] border text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) text-(--text)",
                      intensityClass(c.ratio),
                      c.scheduledOnly && !isSelected
                        ? "border-dashed border-(--border)"
                        : isSelected
                          ? "border-(--accent)"
                          : "border-transparent hover:border-(--border)",
                    )}
                  >
                    <span className="absolute left-1 top-1 text-[10px] font-medium">
                      {c.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-(--muted)">
              Solid = paid &amp; logged · dashed = scheduled, not yet paid
            </p>
          </div>
        </div>

        <div
          ref={detailRef}
          className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3 scroll-mt-20"
        >
        {selectedDay ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-(--text)">
                {fullDateFormatter.format(
                  (() => {
                    const [y, m, d] = selectedDay.date.split("-").map(Number);
                    return new Date(Date.UTC(y!, m! - 1, d!));
                  })(),
                )}
              </p>
              <p className="tabular-nums text-sm font-semibold text-(--text)">
                {formatCurrency(selectedDay.totalPaise, currency, locale)}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {selectedDay.fixedItems.map((f) => {
                const cat = categoryById.get(f.categoryId);
                const isScheduled = f.kind === "scheduled";
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-2.5"
                  >
                    {cat ? (
                      <CategoryIcon name={cat.icon} color={cat.color} size="sm" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-(--text)">{f.name}</p>
                      <p className="text-[11px] text-(--muted)">
                        <span className="font-medium text-(--text)">
                          {isScheduled ? "Scheduled" : "Paid"}
                        </span>
                        {cat ? ` · ${cat.name}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 tabular-nums text-sm",
                        isScheduled ? "text-(--muted)" : "text-(--text)",
                      )}
                    >
                      {formatCurrency(f.amountPaise, currency, locale)}
                    </p>
                  </li>
                );
              })}
              {selectedDay.variableItems.map((v) => {
                const cat = categoryById.get(v.categoryId);
                return (
                  <li
                    key={v.id}
                    className="flex items-center gap-2.5"
                  >
                    {cat ? (
                      <CategoryIcon name={cat.icon} color={cat.color} size="sm" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-(--text)">
                        {v.note ?? cat?.name ?? "Expense"}
                      </p>
                      <p className="text-[11px] text-(--muted)">
                        Variable{cat && v.note ? ` · ${cat.name}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 tabular-nums text-sm text-(--text)">
                      {formatCurrency(v.amountPaise, currency, locale)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-center text-xs text-(--muted)">
            Tap a day to see what was spent.
          </p>
        )}
        </div>
      </div>
    </Card>
  );
}
