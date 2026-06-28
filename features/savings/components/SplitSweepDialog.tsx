"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";
import type { SweepAllocation } from "../actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: PlainNamedSavingsGoal[];
  /** Per-goal balance map (keyed by goalId). Used to detect already-
   *  filled goals so we can default-zero their share rather than
   *  pushing money they don't need. */
  balanceByGoal?: Record<string, number>;
  surplusPaise: number;
  monthLabel: string;
  currency: string;
  locale: string;
  pending: boolean;
  onConfirm: (allocations: SweepAllocation[] | null) => void;
};

// Stable color palette for the segment bar — sequenced so adjacent goals
// get visually distinct hues even with default theme accent.
const SEGMENT_COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "color-mix(in oklab, var(--accent) 60%, var(--success))",
  "color-mix(in oklab, var(--warning) 60%, var(--danger))",
  "color-mix(in oklab, var(--accent) 60%, var(--warning))",
];

/**
 * Distribute paise across goals based on their share %, ensuring the sum
 * equals the surplus to the rupee. Rounding error lands on the largest goal
 * so we don't accidentally lose paise.
 */
function distribute(
  goals: { id: string; sharePct: number }[],
  totalPaise: number,
): Map<string, number> {
  const out = new Map<string, number>();
  if (goals.length === 0) return out;
  let assigned = 0;
  let largestId = goals[0]!.id;
  let largestShare = goals[0]!.sharePct;
  for (const g of goals) {
    const share = (g.sharePct / 100) * totalPaise;
    const rounded = Math.round(share);
    out.set(g.id, rounded);
    assigned += rounded;
    if (g.sharePct > largestShare) {
      largestShare = g.sharePct;
      largestId = g.id;
    }
  }
  const drift = totalPaise - assigned;
  if (drift !== 0) {
    out.set(largestId, (out.get(largestId) ?? 0) + drift);
  }
  return out;
}

/**
 * Confirmation dialog shown before sweeping the previous month's surplus
 * into Savings. Visualizes per-goal split as a horizontal stacked bar with
 * editable share inputs underneath.
 *
 * If the user has no named goals (legacy / fresh accounts), the dialog
 * just shows the total and confirms the sweep without allocations.
 */
export function SplitSweepDialog({
  open,
  onOpenChange,
  goals,
  balanceByGoal,
  surplusPaise,
  monthLabel,
  currency,
  locale,
  pending,
  onConfirm,
}: Props) {
  const noGoals = goals.length === 0;

  const filledIds = useMemo(() => {
    if (!balanceByGoal) return new Set<string>();
    const out = new Set<string>();
    for (const g of goals) {
      const bal = balanceByGoal[g.id] ?? 0;
      if (bal >= g.amountPaise) out.add(g.id);
    }
    return out;
  }, [goals, balanceByGoal]);

  // Initial share map computed deterministically from props. Re-computes
  // when the goals or fill-set changes, providing the seed for our
  // editable-state cache below.
  const initialShares = useMemo<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    const skipped = goals.filter((g) => filledIds.has(g.id));
    const survivors = goals.filter((g) => !filledIds.has(g.id));
    if (skipped.length === 0) {
      for (const g of goals) next[g.id] = g.sharePct;
    } else if (survivors.length === 0) {
      for (const g of goals) next[g.id] = 0;
    } else {
      const skippedShare = skipped.reduce((s, g) => s + g.sharePct, 0);
      const survivorShareTotal = survivors.reduce(
        (s, g) => s + g.sharePct,
        0,
      );
      for (const g of skipped) next[g.id] = 0;
      for (const g of survivors) {
        const bonus =
          survivorShareTotal > 0
            ? (g.sharePct / survivorShareTotal) * skippedShare
            : skippedShare / survivors.length;
        next[g.id] = Math.round(g.sharePct + bonus);
      }
      const total = survivors.reduce((s, g) => s + (next[g.id] ?? 0), 0);
      const drift = 100 - total;
      const last = survivors[survivors.length - 1];
      if (last && drift !== 0) next[last.id] = (next[last.id] ?? 0) + drift;
    }
    return next;
  }, [goals, filledIds]);

  // Track open transitions so we can reset edits on each dialog show.
  // Setting state during render (when prevOpen drifts) is the React-
  // recommended pattern for "derive state from a prop that changed",
  // and avoids the cascade-render lint trip from useEffect.
  const [prevOpen, setPrevOpen] = useState(open);
  const [shares, setShares] = useState<Record<string, number>>(initialShares);
  const [overrideFilled, setOverrideFilled] = useState<Set<string>>(new Set());

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setShares(initialShares);
      setOverrideFilled(new Set());
    }
  }

  const totalShare = useMemo(
    () => goals.reduce((s, g) => s + (shares[g.id] ?? 0), 0),
    [goals, shares],
  );
  const sharesOk = noGoals || Math.abs(totalShare - 100) <= 0.5;
  /** When the user has named goals but every one is filled (and they
   *  haven't overridden any), shares total 0 and we route the surplus
   *  into the unallocated bucket instead of a per-goal split. */
  const sweepToUnallocated = !noGoals && totalShare === 0;
  const canConfirm = noGoals || sharesOk || sweepToUnallocated;

  const allocations = useMemo<SweepAllocation[]>(() => {
    if (noGoals || !sharesOk) return [];
    const dist = distribute(
      goals.map((g) => ({ id: g.id, sharePct: shares[g.id] ?? 0 })),
      surplusPaise,
    );
    return goals
      .map((g) => ({
        goalId: g.id,
        goalName: g.name,
        amountPaise: dist.get(g.id) ?? 0,
      }))
      .filter((a) => a.amountPaise > 0);
  }, [goals, shares, surplusPaise, sharesOk, noGoals]);

  const handleConfirm = () => {
    if (noGoals || sweepToUnallocated) onConfirm(null);
    else if (sharesOk) onConfirm(allocations);
  };

  function includeAnyway(id: string) {
    setOverrideFilled((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
    // Restore this goal's configured share by pulling it back from the
    // currently-zero pool. Keep things simple: take share proportional
    // from the other survivors' current shares.
    setShares((current) => {
      const goal = goals.find((g) => g.id === id);
      if (!goal) return current;
      const restore = goal.sharePct;
      const others = goals.filter(
        (g) => g.id !== id && (current[g.id] ?? 0) > 0,
      );
      const otherTotal = others.reduce(
        (s, g) => s + (current[g.id] ?? 0),
        0,
      );
      const next = { ...current };
      next[id] = restore;
      if (otherTotal > 0) {
        for (const g of others) {
          const cut = ((current[g.id] ?? 0) / otherTotal) * restore;
          next[g.id] = Math.max(0, Math.round((current[g.id] ?? 0) - cut));
        }
      }
      // Round-off so totals stay near 100.
      const total = goals.reduce((s, g) => s + (next[g.id] ?? 0), 0);
      const drift = 100 - total;
      const lastNonZero = [...goals]
        .reverse()
        .find((g) => g.id !== id && (next[g.id] ?? 0) > 0);
      if (lastNonZero && drift !== 0) {
        next[lastNonZero.id] = (next[lastNonZero.id] ?? 0) + drift;
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col gap-1.5">
          <DialogTitle>
            <span className="font-display tracking-tight">
              Sweep {monthLabel}
            </span>
          </DialogTitle>
          <DialogDescription>
            {noGoals
              ? "Move the entire surplus into Savings."
              : "Set how the surplus splits across your goals."}
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-(--muted)">Surplus</span>
            <span className="font-display text-3xl tabular-nums tracking-tight text-(--text)">
              {formatCurrency(surplusPaise, currency, locale)}
            </span>
          </div>

          {!noGoals ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-(--surface-2)">
                {goals.map((g, i) => {
                  const pct = shares[g.id] ?? 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={g.id}
                      aria-label={`${g.name} ${Math.round(pct)}%`}
                      style={{
                        width: `${pct}%`,
                        background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                      }}
                      className="h-full transition-[width] duration-150"
                    />
                  );
                })}
              </div>

              <ul className="flex flex-col gap-2">
                {goals.map((g, i) => {
                  const pct = shares[g.id] ?? 0;
                  const allocPaise = allocations.find((a) => a.goalId === g.id)?.amountPaise ?? 0;
                  const isFilled = filledIds.has(g.id);
                  const overridden = overrideFilled.has(g.id);
                  const showAsSkipped = isFilled && !overridden;
                  return (
                    <li
                      key={g.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3",
                        showAsSkipped && "opacity-70",
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          background:
                            SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                        }}
                      />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-(--text)">
                        {g.name}
                        {showAsSkipped ? (
                          <span className="ml-2 text-[11px] font-normal text-(--success)">
                            ✓ goal reached
                          </span>
                        ) : null}
                      </p>
                      {showAsSkipped ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => includeAnyway(g.id)}
                          className="text-[11px]"
                        >
                          Include anyway
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label={`${g.name} share percent`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(pct)}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (Number.isFinite(n)) {
                                setShares((s) => ({
                                  ...s,
                                  [g.id]: Math.min(100, Math.max(0, n)),
                                }));
                              }
                            }}
                            className="w-16 text-center"
                          />
                          <span className="text-xs text-(--muted)">%</span>
                        </div>
                      )}
                      <p className="basis-full text-right text-xs tabular-nums text-(--muted) sm:basis-auto sm:w-24">
                        {showAsSkipped
                          ? "—"
                          : sharesOk
                            ? formatCurrency(allocPaise, currency, locale)
                            : "—"}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between text-xs">
                <span className="text-(--muted)">
                  {sweepToUnallocated ? (
                    <span className="text-(--success)">
                      All goals reached — surplus will land in Unallocated.
                    </span>
                  ) : (
                    <>
                      Total share:{" "}
                      <span
                        className={cn(
                          "tabular-nums font-medium",
                          sharesOk
                            ? "text-(--success)"
                            : "text-(--warning)",
                        )}
                      >
                        {Math.round(totalShare)}%
                      </span>
                    </>
                  )}
                </span>
                {!sharesOk && !sweepToUnallocated ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Even-distribute remaining
                      const equal = Math.floor(100 / goals.length);
                      const remainder = 100 - equal * goals.length;
                      const next: Record<string, number> = {};
                      goals.forEach((g, i) => {
                        next[g.id] = equal + (i === goals.length - 1 ? remainder : 0);
                      });
                      setShares(next);
                    }}
                  >
                    Even split
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !canConfirm}
          >
            {pending
              ? "Sweeping…"
              : sweepToUnallocated
                ? `Sweep ${formatCurrency(surplusPaise, currency, locale)} to Unallocated`
                : `Sweep ${formatCurrency(surplusPaise, currency, locale)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
