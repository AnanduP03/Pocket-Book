"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { PlainSavingsEntry } from "@/db/repositories/savings";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";

type Props = {
  goal: PlainNamedSavingsGoal;
  currentPaise: number;
  entries: PlainSavingsEntry[];
  currency: string;
  locale: string;
};

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY / DAYS_PER_MONTH;
}

/**
 * Compute trailing N-month average of contributions to this goal.
 * Sums signed entries (positive = deposits, negative = covers/withdrawals)
 * over the last N months and divides.
 */
function trailingMonthlyAvg(
  entries: PlainSavingsEntry[],
  monthsBack: number,
): number {
  if (entries.length === 0 || monthsBack <= 0) return 0;
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - monthsBack);
  const sum = entries
    .filter((e) => new Date(e.effectiveDate).getTime() >= cutoff.getTime())
    .reduce((s, e) => s + e.amountPaise, 0);
  return Math.round(sum / monthsBack);
}

/**
 * Build a trajectory of running balance over time, sampled at a stride
 * appropriate for the entry count. Used to feed the sparkline.
 */
function buildTrajectory(entries: PlainSavingsEntry[]): number[] {
  if (entries.length === 0) return [];
  let running = 0;
  const points: number[] = [];
  for (const e of entries) {
    running += e.amountPaise;
    points.push(running);
  }
  // Keep at most ~60 points for a clean sparkline.
  const stride = Math.max(1, Math.ceil(points.length / 60));
  const sampled: number[] = [];
  for (let i = 0; i < points.length; i += stride) {
    sampled.push(points[i] ?? 0);
  }
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1] ?? 0);
  }
  return sampled;
}

export function GoalDetailView({
  goal,
  currentPaise,
  entries,
  currency,
  locale,
}: Props) {
  const targetPaise = goal.amountPaise;
  const remainingPaise = Math.max(0, targetPaise - currentPaise);
  const progressPct = Math.min(
    100,
    Math.max(0, (currentPaise / targetPaise) * 100),
  );

  const trajectory = useMemo(() => buildTrajectory(entries), [entries]);
  const monthlyAvg = useMemo(() => trailingMonthlyAvg(entries, 3), [entries]);

  const target = new Date(goal.targetDate);
  const now = new Date();
  const monthsToTarget = monthsBetween(now, target);
  const targetLabel = target.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
  });
  const requiredAvg =
    monthsToTarget > 0 ? Math.round(remainingPaise / monthsToTarget) : null;

  // Pace status: on pace, behind, ahead, or no-data.
  let paceLabel: string;
  let paceTone: "success" | "warning" | "muted";
  if (remainingPaise <= 0) {
    paceLabel = "Goal reached";
    paceTone = "success";
  } else if (monthlyAvg <= 0) {
    paceLabel = "No contributions in the last 3 months";
    paceTone = "warning";
  } else if (requiredAvg === null) {
    paceLabel = `Target was ${targetLabel}`;
    paceTone = "warning";
  } else if (monthlyAvg + 1 >= requiredAvg) {
    const months = remainingPaise / monthlyAvg;
    const proj = new Date(now);
    proj.setUTCMonth(proj.getUTCMonth() + Math.ceil(months));
    paceLabel = `On pace for ${proj.toLocaleDateString(locale, { month: "short", year: "numeric" })}`;
    paceTone = "success";
  } else {
    const shortfall = requiredAvg - monthlyAvg;
    paceLabel = `Behind · need ${formatCurrency(shortfall, currency, locale)}/mo more`;
    paceTone = "warning";
  }

  const recentEntries = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.effectiveDate).getTime() -
            new Date(a.effectiveDate).getTime(),
        )
        .slice(0, 8),
    [entries],
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        className="rise-in flex flex-col gap-4 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-5"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
              Saved so far
            </p>
            <p className="font-display text-4xl tabular-nums tracking-tight text-(--text)">
              {formatCurrency(currentPaise, currency, locale)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
              of {formatCurrency(targetPaise, currency, locale)}
            </p>
            <p className="tabular-nums text-base font-medium text-(--text)">
              {Math.round(progressPct)}%
            </p>
          </div>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-(--surface-2)"
          aria-label={`${Math.round(progressPct)}% complete`}
        >
          <div
            className="h-full bg-(--accent) transition-[width] duration-700"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="text-(--muted)">
            {remainingPaise > 0
              ? `${formatCurrency(remainingPaise, currency, locale)} to go`
              : "Goal funded"}
            {" · target "}
            {targetLabel}
          </p>
          <p
            className={cn(
              "tabular-nums font-medium",
              paceTone === "success"
                ? "text-(--success)"
                : paceTone === "warning"
                  ? "text-(--warning)"
                  : "text-(--muted)",
            )}
          >
            {paceLabel}
          </p>
        </div>
      </section>

      <section
        className="rise-in flex flex-col gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-5"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <TrendingUp className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
              Pace
            </p>
            <p className="text-sm font-medium text-(--text)">
              Monthly average: {formatCurrency(monthlyAvg, currency, locale)}
              {requiredAvg !== null && remainingPaise > 0 ? (
                <>
                  {" · need "}
                  <span className="tabular-nums">
                    {formatCurrency(requiredAvg, currency, locale)}
                  </span>
                  /mo
                </>
              ) : null}
            </p>
          </div>
        </div>
        {trajectory.length >= 2 ? (
          <Sparkline
            values={trajectory}
            ariaLabel="Goal balance over time"
            className="h-12 w-full"
            height={48}
          />
        ) : (
          <p className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-3 text-center text-xs text-(--muted)">
            Trajectory appears once there are at least two contributions.
          </p>
        )}
      </section>

      {recentEntries.length > 0 ? (
        <section
          className="rise-in flex flex-col gap-2 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          style={{ animationDelay: "180ms" }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Recent contributions
          </p>
          <ul className="flex flex-col">
            {recentEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-3 border-t border-(--border) py-2 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-(--text)">
                    {e.note ?? `${e.kind.replace(/_/g, " ")}`}
                  </p>
                  <p className="text-[11px] text-(--muted)">
                    {formatDate(new Date(e.effectiveDate), locale)}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 tabular-nums text-sm font-medium",
                    e.amountPaise >= 0 ? "text-(--success)" : "text-(--warning)",
                  )}
                >
                  {e.amountPaise >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(e.amountPaise), currency, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
