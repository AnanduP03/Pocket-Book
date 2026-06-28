"use client";

import { useMemo } from "react";
import { Beaker } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format/money";
import { deriveStatus, type Rule } from "@/features/fixed/lib/billing";
import { useDeferredFixed } from "@/lib/preferences/use-deferred-fixed";
import type { PlainFixedExpense } from "@/db/repositories/fixed";

type Props = {
  fixedHighlights: PlainFixedExpense[];
  freeCashPaise: number;
  remainingFixedPaise: number;
  currency: string;
  locale: string;
};

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
}

/**
 * "What if I pushed this to next month?" — a quiet experiment panel that
 * lists overdue and upcoming fixed expenses with a one-tap deferral
 * toggle. Recomputes free cash + remaining hypothetically. State is
 * client-side only; the underlying expense rules never change.
 *
 * Auto-hides when there's nothing deferrable this month.
 */
export function DeferralExperimentCard({
  fixedHighlights,
  freeCashPaise,
  remainingFixedPaise,
  currency,
  locale,
}: Props) {
  const deferrable = useMemo(() => {
    const now = new Date();
    return fixedHighlights.filter((f) => {
      if (!f.isActive) return false;
      const status = deriveStatus(
        ruleOf(f),
        f.lastPaidDate ? new Date(f.lastPaidDate) : null,
        now,
        f.isActive,
        f.skippedCycles ?? null,
      );
      return status === "overdue" || status === "upcoming";
    });
  }, [fixedHighlights]);

  const { ids, toggle, clear, isDeferred } = useDeferredFixed();

  if (deferrable.length === 0) return null;

  const deferredAmount = deferrable
    .filter((f) => isDeferred(f.id))
    .reduce((s, f) => s + f.amountPaise, 0);

  const hypotheticalFreeCash = freeCashPaise + deferredAmount;
  const hypotheticalRemaining = Math.max(0, remainingFixedPaise - deferredAmount);
  const hasDeferred = ids.length > 0;

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
            >
              <Beaker className="h-3.5 w-3.5 text-(--text)" />
            </span>
            <div>
              <CardTitle>What if you deferred…</CardTitle>
              <CardDescription>
                Hypothetical only — nothing actually changes.
              </CardDescription>
            </div>
          </div>
          {hasDeferred ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-xs"
            >
              Reset
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {deferrable.map((f) => {
          const deferred = isDeferred(f.id);
          return (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    deferred ? "text-(--muted) line-through" : "text-(--text)"
                  }`}
                >
                  {f.name}
                </p>
                <p className="text-[11px] text-(--muted)">
                  {formatCurrency(f.amountPaise, currency, locale)} ·{" "}
                  {f.intervalValue === 1
                    ? f.intervalUnit
                    : `every ${f.intervalValue} ${f.intervalUnit}s`}
                </p>
              </div>
              <Button
                type="button"
                variant={deferred ? "primary" : "outline"}
                size="sm"
                onClick={() => toggle(f.id)}
                className="text-xs"
              >
                {deferred ? "Bring back" : "Defer"}
              </Button>
            </li>
          );
        })}
      </ul>

      {hasDeferred ? (
        <div className="rounded-[var(--radius-input)] bg-(--accent)/10 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            If you deferred those
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] text-(--muted)">Free cash</p>
              <p className="font-display text-lg tabular-nums text-(--text)">
                {formatCurrency(hypotheticalFreeCash, currency, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-(--muted)">Still due</p>
              <p className="font-display text-lg tabular-nums text-(--text)">
                {formatCurrency(hypotheticalRemaining, currency, locale)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
