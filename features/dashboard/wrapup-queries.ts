import "server-only";
import { listCategories } from "@/db/repositories/categories";
import {
  getSavingsBalanceByGoal,
  sumSavingsInRange,
} from "@/db/repositories/savings";
import { listVariable } from "@/db/repositories/variable";
import { getSettings } from "@/db/repositories/settings";
import { incomeForMonthEnd } from "@/db/repositories/income";
import { listFixed, type PlainFixedExpense } from "@/db/repositories/fixed";
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

export type WrapupTone = "tight" | "brisk" | "steady" | "surplus";

export type WrapupTopCategory = {
  name: string;
  color: string;
  paise: number;
};

export type WrapupStandoutDay = {
  /** ISO yyyy-mm-dd */
  date: string;
  totalPaise: number;
  topCategoryName: string | null;
};

export type MonthEndWrapup = {
  /** Stable id like "2026-05" so the client can flag "seen" once per month. */
  monthId: string;
  monthLabel: string;
  year: number;
  month: number;
  tone: WrapupTone;
  /** Tagline shown on screen 1. Pre-computed server-side for consistency. */
  headline: string;
  totalSpendPaise: number;
  incomePaise: number;
  freeCashPaise: number;
  topCategories: WrapupTopCategory[];
  standoutDay: WrapupStandoutDay | null;
  daysUnderAverage: number;
  daysInMonth: number;
  savingsDeltaPaise: number;
  topGoalName: string | null;
  topGoalProgressPct: number | null;
};

function classifyTone(
  freeCash: number,
  totalSpend: number,
  income: number,
): WrapupTone {
  if (income <= 0) return "steady";
  if (freeCash < 0) return "tight";
  if (freeCash >= income * 0.25) return "surplus";
  if (totalSpend > income * 0.85) return "brisk";
  return "steady";
}

/**
 * Compute the previous calendar month's wrap-up. Bundles enough server-
 * computed signal that the client just renders five screens of swipe-able
 * narrative without doing math.
 */
export async function fetchMonthEndWrapup(): Promise<MonthEndWrapup | null> {
  const user = await requireUser();
  const now = new Date();

  // Previous calendar month — handles year wrap.
  const priorRef = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const monthStart = startOfMonthUtc(priorRef);
  const monthEnd = endOfMonthUtc(priorRef);
  const monthIdx = monthStart.getUTCMonth();
  const year = monthStart.getUTCFullYear();
  const monthId = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

  // Fetch everything we need in parallel.
  const [
    fixedItems,
    variableItems,
    incomeEntry,
    categories,
    savingsDeltaPaise,
    savingsBalanceByGoal,
    settings,
  ] = await Promise.all([
    listFixed(user.id),
    listVariable(user.id, {
      start: monthStart,
      end: monthEnd,
      limit: 50_000,
    }),
    incomeForMonthEnd(user.id, monthEnd),
    listCategories(user.id),
    sumSavingsInRange(user.id, monthStart, monthEnd),
    getSavingsBalanceByGoal(user.id),
    getSettings(user.id),
  ]);

  if (variableItems.length === 0 && fixedItems.length === 0) {
    // No data — nothing meaningful to wrap up.
    return null;
  }

  // Sums.
  const incomePaise = incomeEntry?.amountPaise ?? 0;
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
  let variablePaise = 0;
  const byCategory = new Map<string, number>();
  for (const v of variableItems) {
    variablePaise += v.amountPaise;
    byCategory.set(
      v.categoryId,
      (byCategory.get(v.categoryId) ?? 0) + v.amountPaise,
    );
  }
  const totalSpendPaise = fixedPaise + variablePaise;
  const freeCashPaise = incomePaise - totalSpendPaise;

  const tone = classifyTone(freeCashPaise, totalSpendPaise, incomePaise);

  // Top variable categories — bigger spend first.
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const topCategories: WrapupTopCategory[] = [];
  const sortedByPaise = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, paise] of sortedByPaise.slice(0, 3)) {
    const cat = categoryById.get(id);
    if (!cat) continue;
    topCategories.push({ name: cat.name, color: cat.color, paise });
  }

  // Standout day = highest single-day spend (variable only — fixed bills
  // skew toward "rent day" otherwise). Single pass tracks both the
  // by-day map (for the days-under-avg loop below) and the running max.
  const byDay = new Map<string, { paise: number; topCat: string | null; topCatPaise: number }>();
  let standoutDay: WrapupStandoutDay | null = null;
  for (const v of variableItems) {
    const d = new Date(v.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const existing = byDay.get(key) ?? { paise: 0, topCat: null, topCatPaise: 0 };
    existing.paise += v.amountPaise;
    const cat = categoryById.get(v.categoryId);
    if (cat && v.amountPaise > existing.topCatPaise) {
      existing.topCat = cat.name;
      existing.topCatPaise = v.amountPaise;
    }
    byDay.set(key, existing);
    if (!standoutDay || existing.paise > standoutDay.totalPaise) {
      standoutDay = {
        date: key,
        totalPaise: existing.paise,
        topCategoryName: existing.topCat,
      };
    }
  }

  // Days under daily average.
  const daysInMonth = monthEnd.getUTCDate();
  const dailyAvg = variablePaise / daysInMonth;
  let daysUnderAverage = 0;
  // Iterate every day of the month, including zero-spend days.
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayPaise = byDay.get(key)?.paise ?? 0;
    if (dayPaise <= dailyAvg) daysUnderAverage++;
  }

  // Top goal: highest progress % among the user's named goals (if any).
  // Per-goal balance comes from a single MongoDB aggregation rather
  // than client-side summing, so it stays cheap as savings history grows.
  let topGoalName: string | null = null;
  let topGoalProgressPct: number | null = null;
  if (settings.savingsGoals.length > 0) {
    let bestPct = -1;
    for (const g of settings.savingsGoals) {
      const cur = Math.max(0, savingsBalanceByGoal.get(g.id) ?? 0);
      const pct = Math.min(100, (cur / g.amountPaise) * 100);
      if (pct > bestPct) {
        bestPct = pct;
        topGoalName = g.name;
        topGoalProgressPct = Math.round(pct);
      }
    }
  }

  // Headline copy. Tone + month carries most of the meaning.
  const monthLabel = MONTH_LABELS_LONG[monthIdx] ?? "Last month";
  const toneAdj: Record<WrapupTone, string> = {
    tight: "tight",
    brisk: "brisk",
    steady: "steady",
    surplus: "generous",
  };
  const headline = `${monthLabel} was a ${toneAdj[tone]} month.`;

  return {
    monthId,
    monthLabel,
    year,
    month: monthIdx,
    tone,
    headline,
    totalSpendPaise,
    incomePaise,
    freeCashPaise,
    topCategories,
    standoutDay,
    daysUnderAverage,
    daysInMonth,
    savingsDeltaPaise,
    topGoalName,
    topGoalProgressPct,
  };
}
