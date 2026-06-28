import {
  deriveStatus,
  renewalsInRange,
  ruleOf,
} from "./billing";
import { endOfMonthUtc, startOfMonthUtc } from "@/lib/format/date";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainPayment } from "@/db/repositories/payments";

export type ThisMonthSummary = {
  duePaise: number;
  paidPaise: number;
  remainingPaise: number;
  overdueCount: number;
};

/**
 * Aggregate the "This month" hero card numbers. Pure — no DB or clock
 * reads beyond the optional `now` arg, so tests can fix the date.
 *
 * - duePaise: sum of amountPaise × renewalsInRange(monthStart..monthEnd)
 *   over active fixed expenses, with skipped cycles excluded.
 * - paidPaise: sum of payments with paidDate in [monthStart, monthEnd].
 * - remainingPaise: max(0, duePaise - paidPaise).
 * - overdueCount: number of items whose deriveStatus is "overdue".
 */
export function thisMonthSummary(
  items: PlainFixedExpense[],
  payments: PlainPayment[],
  now: Date = new Date(),
): ThisMonthSummary {
  const monthStart = startOfMonthUtc(now);
  const monthEnd = endOfMonthUtc(now);

  let duePaise = 0;
  let overdueCount = 0;
  for (const f of items) {
    if (f.isActive) {
      const renewals = renewalsInRange(
        ruleOf(f),
        monthStart,
        monthEnd,
        f.skippedCycles ?? null,
      );
      duePaise += renewals.length * f.amountPaise;
    }
    const status = deriveStatus(
      ruleOf(f),
      f.lastPaidDate ? new Date(f.lastPaidDate) : null,
      now,
      f.isActive,
      f.skippedCycles ?? null,
    );
    if (status === "overdue") overdueCount++;
  }

  let paidPaise = 0;
  const startTs = monthStart.getTime();
  const endTs = monthEnd.getTime();
  for (const p of payments) {
    const t = new Date(p.paidDate).getTime();
    if (t >= startTs && t <= endTs) paidPaise += p.amountPaise;
  }

  return {
    duePaise,
    paidPaise,
    remainingPaise: Math.max(0, duePaise - paidPaise),
    overdueCount,
  };
}
