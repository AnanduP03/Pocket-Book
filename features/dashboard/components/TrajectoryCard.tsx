"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";
import { buildForecast } from "../lib/forecast-cone";
import type { MonthlyTotal } from "../queries";

type Props = {
  monthlyTotals: MonthlyTotal[];
  currency: string;
  locale: string;
};

type Point = {
  label: string;
  fixed: number;
  variable: number;
  income: number;
  spend: number;
  /** Range tuple [low, high] used by recharts to draw a band. Only set
   *  on forecast months; historical months omit it so the band only
   *  shows on the right side of the chart. */
  forecastBand?: [number, number];
  forecastMean?: number;
  forecastIncome?: number;
  forecastLow?: number;
  forecastHigh?: number;
  isForecast?: boolean;
};

type TipPayload = {
  payload: Point;
};

function ChartTooltip({
  active,
  payload,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: TipPayload[];
  currency: string;
  locale: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  if (p.isForecast) {
    return (
      <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-3 py-2 shadow-(--shadow-sheet)">
        <p className="text-xs font-medium text-(--text)">{p.label} · forecast</p>
        <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
          <li className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-(--muted)">Likely spend</span>
            <span className="text-(--text)">
              {formatCurrency(p.forecastMean ?? 0, currency, locale)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-(--muted)">Range</span>
            <span className="text-(--text)">
              {formatCurrency(p.forecastLow ?? 0, currency, locale)}–
              {formatCurrency(p.forecastHigh ?? 0, currency, locale)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-(--muted)">Income</span>
            <span className="text-(--text)">
              {formatCurrency(p.forecastIncome ?? 0, currency, locale)}
            </span>
          </li>
        </ul>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-3 py-2 shadow-(--shadow-sheet)">
      <p className="text-xs font-medium text-(--text)">{p.label}</p>
      <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
        <li className="flex items-center justify-between gap-3 tabular-nums">
          <span className="text-(--muted)">Income</span>
          <span className="text-(--text)">
            {formatCurrency(p.income, currency, locale)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 tabular-nums">
          <span className="text-(--muted)">Fixed</span>
          <span className="text-(--text)">
            {formatCurrency(p.fixed, currency, locale)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 tabular-nums">
          <span className="text-(--muted)">Variable</span>
          <span className="text-(--text)">
            {formatCurrency(p.variable, currency, locale)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function compactCurrency(paise: number, currency: string, locale: string): string {
  const n = paise / 100;
  if (Math.abs(n) >= 1_00_000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function TrajectoryCard({ monthlyTotals, currency, locale }: Props) {
  const data = useMemo<Point[]>(() => {
    const historical: Point[] = monthlyTotals.map((m) => ({
      label: `${m.label} ${String(m.year).slice(-2)}`,
      fixed: m.fixedPaise,
      variable: m.variablePaise,
      income: m.incomePaise,
      spend: m.fixedPaise + m.variablePaise,
    }));
    const forecast = buildForecast(monthlyTotals).map((f) => ({
      label: f.label,
      fixed: 0,
      variable: 0,
      income: 0,
      spend: 0,
      forecastBand: [f.lowSpendPaise, f.highSpendPaise] as [number, number],
      forecastLow: f.lowSpendPaise,
      forecastHigh: f.highSpendPaise,
      forecastMean: f.meanSpendPaise,
      forecastIncome: f.forecastIncomePaise,
      isForecast: true,
    }));
    return [...historical, ...forecast];
  }, [monthlyTotals]);

  const hasIncome = data.some((d) => d.income > 0);
  const hasSpend = data.some((d) => d.spend > 0);
  const forecastStartIdx = useMemo(
    () => data.findIndex((d) => d.isForecast),
    [data],
  );

  if (!hasIncome && !hasSpend) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeader>
          <CardTitle>Trajectory</CardTitle>
          <CardDescription>6-month trend</CardDescription>
        </CardHeader>
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-6 text-center text-sm text-(--muted)">
          Log a few months of income and expenses to see the long view.
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>Trajectory</CardTitle>
          <CardDescription>
            6 months back, 3 months forecast · likely range shaded
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-(--muted) sm:text-[11px] sm:tracking-[0.18em]">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-(--accent)" />
            Variable
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-(--warning)" />
            Fixed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-px bg-(--success)" />
            Income
          </span>
          {forecastStartIdx >= 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-3 rounded-sm bg-(--muted)/30" />
              Forecast cone
            </span>
          ) : null}
        </div>
      </CardHeader>

      <div className="-mx-4 h-[260px] sm:mx-0">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="varFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.65} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fixedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--muted)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => compactCurrency(v, currency, locale)}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              content={<ChartTooltip currency={currency} locale={locale} />}
            />
            {forecastStartIdx >= 0 && data[forecastStartIdx] && data[data.length - 1] ? (
              <ReferenceArea
                x1={data[forecastStartIdx]!.label}
                x2={data[data.length - 1]!.label}
                fill="var(--muted)"
                fillOpacity={0.04}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="forecastBand"
              stroke="none"
              fill="url(#forecastFill)"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecastMean"
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecastIncome"
              stroke="var(--success)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="fixed"
              stackId="1"
              stroke="var(--warning)"
              strokeWidth={1.5}
              fill="url(#fixedFill)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="variable"
              stackId="1"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#varFill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="var(--success)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--success)" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
