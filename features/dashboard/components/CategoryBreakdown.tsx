"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format/money";
import type { CategoryWithTrend, MonthlyBreakdown } from "../queries";

type Props = {
  monthlyBreakdowns: MonthlyBreakdown[];
  currency: string;
  locale: string;
};

type Tab = "Variable" | "Fixed";

type DonutTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: CategoryWithTrend }>;
  currency: string;
  locale: string;
};

function DonutTooltip({ active, payload, currency, locale }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-2.5 py-1.5 shadow-(--shadow-sheet)">
      <p className="text-xs font-medium text-(--text)">{point.name}</p>
      <p className="text-xs tabular-nums text-(--muted)">
        {formatCurrency(point.paise, currency, locale)}
      </p>
    </div>
  );
}

function TrendBadge({
  delta,
  deltaPct,
}: {
  delta: number;
  deltaPct: number | null;
}) {
  if (deltaPct == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-(--surface-2) px-1.5 py-0.5 text-[10px] font-medium text-(--muted)">
        New
      </span>
    );
  }
  if (Math.abs(deltaPct) < 0.5) {
    return (
      <span className="inline-flex items-center rounded-full bg-(--surface-2) px-1.5 py-0.5 text-[10px] font-medium text-(--muted)">
        Flat
      </span>
    );
  }
  const up = delta > 0;
  const tone = up ? "bg-(--warning)/40" : "bg-(--success)/40";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-(--text)",
        tone,
      )}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {Math.abs(deltaPct).toFixed(deltaPct % 1 === 0 ? 0 : 1)}%
    </span>
  );
}

export function CategoryBreakdown({ monthlyBreakdowns, currency, locale }: Props) {
  const [tab, setTab] = useState<Tab>("Variable");
  const [monthIndex, setMonthIndex] = useState(monthlyBreakdowns.length - 1);
  const safeIndex = Math.max(
    0,
    Math.min(monthIndex, monthlyBreakdowns.length - 1),
  );
  const breakdown = monthlyBreakdowns[safeIndex];

  const data = breakdown
    ? tab === "Variable"
      ? breakdown.variable
      : breakdown.fixed
    : [];
  const total = useMemo(() => data.reduce((s, c) => s + c.paise, 0), [data]);
  const isCurrentMonth = safeIndex === monthlyBreakdowns.length - 1;
  const trailingCount = breakdown?.trailingCount ?? 0;

  const monthLabel = breakdown
    ? `${breakdown.label} ${breakdown.year}`
    : "—";

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>
            {isCurrentMonth ? "This month" : "Past month"}
          </CardTitle>
          <CardDescription>
            {trailingCount > 0
              ? `vs ${trailingCount}-month average`
              : "Add more history to see trends"}
          </CardDescription>
        </div>
        <div
          role="radiogroup"
          aria-label="Breakdown filter"
          className="flex gap-0.5 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2) p-0.5"
        >
          {(["Variable", "Fixed"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-[var(--radius-input)] px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
                  active
                    ? "bg-(--surface) text-(--text) shadow-sm"
                    : "text-(--muted) hover:text-(--text)",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={safeIndex === 0}
          onClick={() => setMonthIndex(Math.max(0, safeIndex - 1))}
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
          disabled={safeIndex >= monthlyBreakdowns.length - 1}
          onClick={() =>
            setMonthIndex(
              Math.min(monthlyBreakdowns.length - 1, safeIndex + 1),
            )
          }
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-(--muted)">
            Total
          </span>
          <span className="tabular-nums text-base font-semibold text-(--text)">
            {formatCurrency(total, currency, locale)}
          </span>
          {!isCurrentMonth ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMonthIndex(monthlyBreakdowns.length - 1)}
            >
              Jump to current
            </Button>
          ) : null}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-6 text-center text-sm text-(--muted)">
          {tab === "Variable"
            ? `No variable spending logged for ${monthLabel}.`
            : `No fixed renewals fell in ${monthLabel} — quarterly or yearly bills only show up on their renewal months.`}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_2fr] md:items-center">
          <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
            <PieChart width={200} height={200}>
              <Pie
                data={data}
                dataKey="paise"
                nameKey="name"
                innerRadius="55%"
                outerRadius="92%"
                strokeWidth={2}
                stroke="var(--surface)"
                isAnimationActive={false}
              >
                {data.map((s) => (
                  <Cell key={s.categoryId} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip currency={currency} locale={locale} />} />
            </PieChart>
          </div>

          <ul className="flex flex-col gap-2.5">
            {data.map((c) => {
              const share = total > 0 ? (c.paise / total) * 100 : 0;
              return (
                <li
                  key={c.categoryId}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <p className="truncate text-sm text-(--text)">{c.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="tabular-nums text-sm font-medium text-(--text)">
                        {formatCurrency(c.paise, currency, locale)}
                      </p>
                      {trailingCount > 0 ? (
                        <TrendBadge
                          delta={c.deltaPaise}
                          deltaPct={c.deltaPct}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-(--surface-2)">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, background: c.color }}
                        aria-hidden
                      />
                    </div>
                    <span className="shrink-0 tabular-nums text-[11px] text-(--muted)">
                      {share.toFixed(0)}%
                      {trailingCount > 0
                        ? ` · avg ${formatCurrency(c.avgPaise, currency, locale)}`
                        : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
