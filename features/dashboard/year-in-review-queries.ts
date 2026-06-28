import "server-only";
import { listCategories } from "@/db/repositories/categories";
import { savingsAggregateForYear } from "@/db/repositories/savings";
import { listVariable } from "@/db/repositories/variable";
import { listFixed, type PlainFixedExpense } from "@/db/repositories/fixed";
import { incomeForMonthEnd } from "@/db/repositories/income";
import {
  listPaymentsForRange,
  type PlainPayment,
} from "@/db/repositories/payments";
import {
  renewalsInRange,
  ruleOf,
} from "@/features/fixed/lib/billing";
import { endOfMonthUtc, startOfMonthUtc } from "@/lib/format/date";
import { requireUser } from "@/lib/auth/server";

const MONTH_LABELS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type YearInReviewMonth = {
  monthIdx: number;
  monthLabel: string;
  incomePaise: number;
  fixedPaise: number;
  variablePaise: number;
  freeCashPaise: number;
  savingsDeltaPaise: number;
};

export type YearInReviewBiggestExpense = {
  date: string;
  amountPaise: number;
  note: string | null;
  categoryName: string | null;
};

export type YearInReviewTopCategory = {
  name: string;
  color: string;
  paise: number;
  share: number;
};

export type YearInReview = {
  year: number;
  /** True once we have any data at all for the year. */
  hasData: boolean;
  totalIncomePaise: number;
  totalFixedPaise: number;
  totalVariablePaise: number;
  totalSavingsDeltaPaise: number;
  /** 12 buckets (jan..dec). */
  monthly: YearInReviewMonth[];
  topCategories: YearInReviewTopCategory[];
  biggestExpense: YearInReviewBiggestExpense | null;
  /** Longest run of consecutive days (within the year) at or under the
   *  user's daily variable average for the year. */
  longestUnderAvgStreak: number;
  /** Day with highest variable spend (date + paise). */
  biggestDay: { date: string; paise: number } | null;
  /** How many fixed-expense payments were marked paid in the year. */
  paymentsCount: number;
  /** How many month-end sweeps happened. */
  sweepsCount: number;
};

/**
 * Aggregate the user's spending year. Runs December-only in the UI
 * (Phase G feature), but the data layer is always available — useful
 * for ad-hoc exports, snapshots, or testing.
 *
 * Pass `year` to back-compute prior years. Defaults to the current year.
 */
export async function fetchYearInReview(
  year?: number,
): Promise<YearInReview> {
  const user = await requireUser();
  const target = year ?? new Date().getUTCFullYear();
  const start = new Date(Date.UTC(target, 0, 1));
  const end = new Date(Date.UTC(target, 11, 31, 23, 59, 59, 999));

  const fixedItemsPromise = listFixed(user.id);
  const paymentsPromise = fixedItemsPromise.then((items) =>
    listPaymentsForRange(
      user.id,
      items.map((f) => f.id),
      start,
      end,
    ),
  );

  // 12 month-ends for income lookups.
  const monthEnds = Array.from({ length: 12 }, (_, m) =>
    endOfMonthUtc(new Date(Date.UTC(target, m, 1))),
  );
  const incomePromises = monthEnds.map((e) => incomeForMonthEnd(user.id, e));

  const [
    fixedItems,
    variableItems,
    categories,
    savingsAgg,
    payments,
    incomes,
  ] = await Promise.all([
    fixedItemsPromise,
    listVariable(user.id, { start, end, limit: 50_000 }),
    listCategories(user.id),
    savingsAggregateForYear(user.id, target),
    paymentsPromise,
    Promise.all(incomePromises),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const fixedById = new Map(fixedItems.map((f) => [f.id, f] as const));

  // Bucket variable items by month in a single pass — avoids the
  // 12 × N nested scan we'd get if each month re-iterated the list.
  const variableByMonth = new Array<number>(12).fill(0);
  for (const v of variableItems) {
    const idx = new Date(v.date).getUTCMonth();
    if (idx >= 0 && idx < 12) variableByMonth[idx] = (variableByMonth[idx] ?? 0) + v.amountPaise;
  }

  const monthly: YearInReviewMonth[] = [];
  for (let m = 0; m < 12; m++) {
    const monthStart = startOfMonthUtc(new Date(Date.UTC(target, m, 1)));
    const monthEnd = endOfMonthUtc(monthStart);

    let fixedPaise = 0;
    for (const f of fixedItems) {
      if (!f.isActive) continue;
      const r = renewalsInRange(
        ruleOf(f),
        monthStart,
        monthEnd,
        f.skippedCycles ?? null,
      );
      fixedPaise += r.length * f.amountPaise;
    }

    const variablePaise = variableByMonth[m] ?? 0;
    const savingsDeltaPaise = savingsAgg.monthly[m] ?? 0;

    const incomePaise = incomes[m]?.amountPaise ?? 0;
    monthly.push({
      monthIdx: m,
      monthLabel: MONTH_LABELS_LONG[m] ?? "",
      incomePaise,
      fixedPaise,
      variablePaise,
      freeCashPaise: incomePaise - fixedPaise - variablePaise,
      savingsDeltaPaise,
    });
  }

  const totalIncomePaise = monthly.reduce((s, m) => s + m.incomePaise, 0);
  const totalFixedPaise = monthly.reduce((s, m) => s + m.fixedPaise, 0);
  const totalVariablePaise = monthly.reduce((s, m) => s + m.variablePaise, 0);
  const totalSavingsDeltaPaise = monthly.reduce(
    (s, m) => s + m.savingsDeltaPaise,
    0,
  );

  // Top categories — by total variable + fixed spend across the year.
  const byCategory = new Map<string, number>();
  for (const v of variableItems) {
    byCategory.set(
      v.categoryId,
      (byCategory.get(v.categoryId) ?? 0) + v.amountPaise,
    );
  }
  for (const p of payments as PlainPayment[]) {
    const f = fixedById.get(p.fixedExpenseId);
    if (!f) continue;
    byCategory.set(
      f.categoryId,
      (byCategory.get(f.categoryId) ?? 0) + p.amountPaise,
    );
  }
  const grandTotal = totalFixedPaise + totalVariablePaise || 1;
  const topCategories: YearInReviewTopCategory[] = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, paise]) => {
      const cat = categoryById.get(id);
      return {
        name: cat?.name ?? "Unknown",
        color: cat?.color ?? "var(--muted)",
        paise,
        share: paise / grandTotal,
      };
    });

  // Biggest single expense (variable only — payments are recurring and
  // less interesting).
  let biggestExpense: YearInReviewBiggestExpense | null = null;
  for (const v of variableItems) {
    if (!biggestExpense || v.amountPaise > biggestExpense.amountPaise) {
      const cat = categoryById.get(v.categoryId);
      biggestExpense = {
        date: new Date(v.date).toISOString().slice(0, 10),
        amountPaise: v.amountPaise,
        note: v.note,
        categoryName: cat?.name ?? null,
      };
    }
  }

  // Biggest day + streak below daily-avg. Single pass picks both
  // the biggest day and seeds the by-day lookup the streak loop reads.
  const byDay = new Map<string, number>();
  let biggestDay: { date: string; paise: number } | null = null;
  for (const v of variableItems) {
    const key = new Date(v.date).toISOString().slice(0, 10);
    const next = (byDay.get(key) ?? 0) + v.amountPaise;
    byDay.set(key, next);
    if (!biggestDay || next > biggestDay.paise) {
      biggestDay = { date: key, paise: next };
    }
  }

  // Daily avg over days with any spend (so a sparse year doesn't read
  // as "all days below average").
  const daysWithSpend = byDay.size || 1;
  const dailyAvg = totalVariablePaise / daysWithSpend;

  // Walk every day of the year, counting consecutive days at or under
  // the average (zero-spend days qualify).
  let longestUnderAvgStreak = 0;
  let running = 0;
  const cursor = new Date(start.getTime());
  const lastTs = end.getTime();
  while (cursor.getTime() <= lastTs) {
    const key = cursor.toISOString().slice(0, 10);
    const dayPaise = byDay.get(key) ?? 0;
    if (dayPaise <= dailyAvg) {
      running += 1;
      if (running > longestUnderAvgStreak) longestUnderAvgStreak = running;
    } else {
      running = 0;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const paymentsCount = payments.length;
  const sweepsCount = savingsAgg.sweepsCount;

  const hasData =
    variableItems.length > 0 ||
    payments.length > 0 ||
    totalIncomePaise > 0 ||
    savingsAgg.totalCount > 0;

  return {
    year: target,
    hasData,
    totalIncomePaise,
    totalFixedPaise,
    totalVariablePaise,
    totalSavingsDeltaPaise,
    monthly,
    topCategories,
    biggestExpense,
    longestUnderAvgStreak,
    biggestDay,
    paymentsCount,
    sweepsCount,
  };
}
