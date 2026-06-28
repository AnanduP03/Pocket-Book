import Link from "next/link";
import { ArrowRight, PiggyBank } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";

type Props = {
  balance: number;
  thisMonthDeltaPaise: number;
  currency: string;
  locale: string;
  goalAmountPaise: number | null;
  goalTargetDate: string | null;
  monthlySavingsAvgPaise: number;
  /** Named goals from settings — when present, the card renders a stacked
   *  per-goal progress strip instead of the single-goal pace line. */
  goals: PlainNamedSavingsGoal[];
  /** Per-goal balance, keyed by goalId. `null` key holds unallocated /
   *  legacy-entry balance. */
  balanceByGoal: Map<string | null, number>;
};

function monthsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

// Stable color palette for stacked-bar segments — matches SplitSweepDialog.
const SEGMENT_COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "color-mix(in oklab, var(--accent) 60%, var(--success))",
  "color-mix(in oklab, var(--warning) 60%, var(--danger))",
  "color-mix(in oklab, var(--accent) 60%, var(--warning))",
];

export function SavingsCard({
  balance,
  thisMonthDeltaPaise,
  currency,
  locale,
  goalAmountPaise,
  goalTargetDate,
  monthlySavingsAvgPaise,
  goals,
  balanceByGoal,
}: Props) {
  const positive = balance >= 0;
  const deltaUp = thisMonthDeltaPaise > 0;
  const deltaDown = thisMonthDeltaPaise < 0;
  const deltaLabel =
    thisMonthDeltaPaise === 0
      ? "Flat this month"
      : `${deltaUp ? "+" : "−"}${formatCurrency(Math.abs(thisMonthDeltaPaise), currency, locale)} this month`;

  // Multi-goal mode: stacked progress with per-goal rows.
  let goalNode: React.ReactNode = null;
  if (goals.length > 0) {
    goalNode = (
      <div className="mt-1 flex flex-col gap-2">
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)"
          aria-label="Goals progress"
        >
          {goals.map((g, i) => {
            const cur = Math.max(0, balanceByGoal.get(g.id) ?? 0);
            const pct = Math.min(100, (cur / g.amountPaise) * 100);
            // Each goal segment occupies a slice of the bar width
            // proportional to its target (so visually larger goals take
            // more bar). Inside each slice, fill % shows progress.
            const totalTarget = goals.reduce((s, x) => s + x.amountPaise, 0);
            const segWidth = (g.amountPaise / totalTarget) * 100;
            return (
              <div
                key={g.id}
                className="relative h-full"
                style={{ width: `${segWidth}%` }}
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 transition-[width] duration-700"
                  style={{
                    width: `${pct}%`,
                    background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                  }}
                />
              </div>
            );
          })}
        </div>

        <ul className="flex flex-col gap-1">
          {goals.slice(0, 3).map((g, i) => {
            const cur = Math.max(0, balanceByGoal.get(g.id) ?? 0);
            const pct = Math.min(
              100,
              Math.round((cur / g.amountPaise) * 100),
            );
            return (
              <li
                key={g.id}
                className="flex items-baseline justify-between gap-2 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                    }}
                  />
                  <span className="truncate text-(--text)">{g.name}</span>
                </span>
                <span className="tabular-nums text-(--muted)">{pct}%</span>
              </li>
            );
          })}
          {goals.length > 3 ? (
            <li className="text-[11px] text-(--muted)">
              + {goals.length - 3} more
            </li>
          ) : null}
        </ul>
      </div>
    );
  } else if (goalAmountPaise && goalAmountPaise > 0 && goalTargetDate) {
    // Legacy single-goal fallback (still useful while migration ripples).
    const target = new Date(goalTargetDate);
    const remaining = Math.max(0, goalAmountPaise - Math.max(0, balance));
    const progressPct = Math.min(
      100,
      Math.max(0, (Math.max(0, balance) / goalAmountPaise) * 100),
    );
    const targetLabel = target.toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
    });

    let paceText = "";
    let paceTone: "success" | "warning" | "muted" = "muted";
    if (remaining <= 0) {
      paceText = "Goal reached";
      paceTone = "success";
    } else if (monthlySavingsAvgPaise <= 0) {
      paceText = "Set aside more to make pace";
      paceTone = "warning";
    } else {
      const now = new Date();
      const monthsToTarget = monthsBetween(now, target);
      if (monthsToTarget <= 0) {
        paceText = `Target was ${targetLabel}`;
        paceTone = "warning";
      } else {
        const requiredAvg = remaining / monthsToTarget;
        if (monthlySavingsAvgPaise + 1 >= requiredAvg) {
          const monthsToGoalAtPace = remaining / monthlySavingsAvgPaise;
          const projDate = new Date(now.getTime());
          projDate.setUTCMonth(projDate.getUTCMonth() + Math.ceil(monthsToGoalAtPace));
          const projLabel = projDate.toLocaleDateString(locale, {
            month: "short",
            year: "numeric",
          });
          paceText = `On pace for ${projLabel}`;
          paceTone = "success";
        } else {
          const shortfallPerMonth = Math.round(requiredAvg - monthlySavingsAvgPaise);
          paceText = `Behind pace · need ${formatCurrency(shortfallPerMonth, currency, locale)}/mo more`;
          paceTone = "warning";
        }
      }
    }

    goalNode = (
      <div className="mt-1 flex flex-col gap-1.5">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)"
          aria-label={`Goal progress ${Math.round(progressPct)}%`}
        >
          <div
            className="h-full bg-(--accent) transition-[width] duration-700"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px]">
          <span className="tabular-nums text-(--muted)">
            {remaining > 0
              ? `${formatCurrency(remaining, currency, locale)} to go`
              : "Goal reached"}
            {" · target "}
            {targetLabel}
          </span>
          <span
            className={cn(
              paceTone === "success"
                ? "text-(--success)"
                : paceTone === "warning"
                  ? "text-(--warning)"
                  : "text-(--muted)",
            )}
          >
            {paceText}
          </span>
        </div>
      </div>
    );
  }

  const goalDestHref = goals.length > 0 ? "/savings/goals" : "/savings";
  const subtitle =
    goals.length > 0
      ? `${goals.length} ${goals.length === 1 ? "goal" : "goals"}`
      : goalAmountPaise
        ? "Reserve · goal set"
        : "Reserve";

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
          >
            <PiggyBank className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Savings</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
        </div>
        <Link
          href={goalDestHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          {goals.length > 0 ? "Goals" : "Manage"}{" "}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </CardHeader>

      <p
        className={
          positive
            ? "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--text) break-words sm:text-4xl lg:text-5xl"
            : "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--danger) break-words sm:text-4xl lg:text-5xl"
        }
      >
        {formatCurrency(balance, currency, locale)}
      </p>

      <p
        className={
          deltaUp
            ? "text-xs text-(--success)"
            : deltaDown
              ? "text-xs text-(--warning)"
              : "text-xs text-(--muted)"
        }
      >
        <span className="tabular-nums font-medium">{deltaLabel}</span>
      </p>

      {goalNode}

      <div className="mt-auto pt-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-(--muted)">
          {goals.length > 0
            ? "Goals tracked across sweeps"
            : goalAmountPaise
              ? "Goal tracks against monthly sweeps"
              : "Sweeps land here at month-end"}
        </p>
      </div>
    </Card>
  );
}
