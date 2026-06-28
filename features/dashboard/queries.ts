import "server-only";
import { listCategories, type PlainCategory } from "@/db/repositories/categories";
import { listFixed, type PlainFixedExpense } from "@/db/repositories/fixed";
import { incomeForMonthEnd } from "@/db/repositories/income";
import {
  listPaymentsForRange,
  type PlainPayment,
} from "@/db/repositories/payments";
import { listVariable, type PlainVariable } from "@/db/repositories/variable";
import {
  getSavingsBalance,
  getSavingsBalanceByGoal,
  hasMonthCover,
  hasMonthSurplus,
  sumSavingsInRange,
} from "@/db/repositories/savings";
import {
  getSettings,
  type PlainNamedSavingsGoal,
} from "@/db/repositories/settings";
import {
  cycleBoundsAt,
  deriveStatus,
  renewalsInRange,
  ruleOf,
} from "@/features/fixed/lib/billing";
import {
  endOfMonthUtc,
  startOfMonthUtc,
  toDateInputValue,
} from "@/lib/format/date";
import { requireUser } from "@/lib/auth/server";

const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_LABELS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type FixedStatusCounts = {
  paid: number;
  overdue: number;
  upcoming: number;
  inactive: number;
  skipped: number;
};

export type CategoryWithTrend = {
  categoryId: string;
  name: string;
  color: string;
  type: "Fixed" | "Variable";
  paise: number;
  avgPaise: number;
  deltaPaise: number;
  deltaPct: number | null;
};

export type MonthlyBreakdown = {
  label: string;
  year: number;
  month: number;
  trailingCount: number;
  variable: CategoryWithTrend[];
  fixed: CategoryWithTrend[];
};

export type DayVariableItem = {
  id: string;
  amountPaise: number;
  categoryId: string;
  note: string | null;
};

export type DayFixedItem = {
  id: string;
  name: string;
  amountPaise: number;
  categoryId: string;
  kind: "paid" | "scheduled";
};

export type DayDetail = {
  date: string;
  totalPaise: number;
  variableItems: DayVariableItem[];
  fixedItems: DayFixedItem[];
};

export type MonthlyDailySpend = {
  label: string;
  year: number;
  month: number;
  daysInMonth: number;
  totalPaise: number;
  maxDayPaise: number;
  days: DayDetail[];
};

export type MonthlyTotal = {
  label: string;
  year: number;
  month: number;
  incomePaise: number;
  variablePaise: number;
  fixedPaise: number;
  freeCashPaise: number;
};

export type PendingSweep = {
  monthLabel: string;
  monthStart: string; // ISO
  monthEnd: string;
  surplusPaise: number;
};

export type ShortfallHint = {
  shortfallPaise: number;
  balancePaise: number;
  coverablePaise: number;
};

export type SpendingClimate = "tight" | "brisk" | "steady" | "surplus";

export type DashboardData = {
  currency: string;
  locale: string;
  monthlyIncomePaise: number;
  monthlyFixedPaise: number;
  monthlyVariablePaise: number;
  remainingFixedPaise: number;
  avgVariablePaise: number;
  trailingMonthsForAvg: number;
  freeCashPaise: number;
  projectedEndOfMonthFreeCashPaise: number;
  projectedRunsOutAtIso: string | null;
  daysInMonth: number;
  daysElapsed: number;
  todaySpendPaise: number;
  monthlyBreakdowns: MonthlyBreakdown[];
  monthlyTotals: MonthlyTotal[];
  dailySpend: MonthlyDailySpend[];
  statusCounts: FixedStatusCounts;
  fixedHighlights: PlainFixedExpense[];
  recentVariable: PlainVariable[];
  categories: PlainCategory[];
  autoDebitNeedsConfirm: PlainFixedExpense[];
  pendingSweep: PendingSweep | null;
  shortfallHint: ShortfallHint | null;
  savingsBalance: number;
  savingsThisMonthDeltaPaise: number;
  savingsGoalAmountPaise: number | null;
  savingsGoalTargetDate: string | null;
  monthlySavingsAvgPaise: number;
  savingsGoals: PlainNamedSavingsGoal[];
  /** Serialized as plain entries since Map isn't JSON-serializable. Keyed
   *  by goalId; "" key (empty string) holds unallocated / legacy entries. */
  savingsBalanceByGoal: Record<string, number>;
  /** Single-word ambient indicator computed from current-month spend
   *  vs historical baselines. Surfaced as a pill at the top of the
   *  dashboard so the user can read the temperature of the month at a
   *  glance, without parsing numbers. */
  spendingClimate: SpendingClimate;
};

/** Lean payload SSR'd into the dashboard page. Excludes the heaviest pieces
 *  (`monthlyBreakdowns`, `dailySpend`) which load asynchronously via React
 *  Query in the chart components. */
export type DashboardCoreData = Omit<
  DashboardData,
  "monthlyBreakdowns" | "dailySpend"
>;

/** Charts-only slice fetched client-side via React Query. */
export type DashboardChartsData = Pick<
  DashboardData,
  "monthlyBreakdowns" | "dailySpend"
>;

/**
 * Classify the current month's spending temperature.
 *
 *  - tight    : projected end-of-month free cash is negative
 *  - brisk    : on pace to spend ≥ 115% of trailing variable average
 *  - surplus  : projected free cash ≥ 25% of monthly income
 *  - steady   : everything else
 *
 * `null` is returned only when there's no income to anchor to (fresh
 * accounts) so callers can decide how to display it; we collapse to
 * "steady" before returning.
 */
function classifyClimate(args: {
  monthlyIncomePaise: number;
  monthlyVariablePaise: number;
  avgVariablePaise: number;
  daysElapsed: number;
  daysInMonth: number;
  projectedFreeCashPaise: number;
}): SpendingClimate {
  const { monthlyIncomePaise, monthlyVariablePaise, avgVariablePaise, daysElapsed, daysInMonth, projectedFreeCashPaise } = args;
  if (projectedFreeCashPaise < 0) return "tight";
  if (avgVariablePaise > 0 && daysElapsed > 0) {
    const projectedVariable = (monthlyVariablePaise / daysElapsed) * daysInMonth;
    if (projectedVariable >= avgVariablePaise * 1.15) return "brisk";
  }
  if (monthlyIncomePaise > 0 && projectedFreeCashPaise >= monthlyIncomePaise * 0.25) {
    return "surplus";
  }
  return "steady";
}

type MonthBucket = {
  label: string;
  year: number;
  month: number;
  start: Date;
  end: Date;
  fixedPaise: number;
  variablePaise: number;
  variableByCategory: Map<string, number>;
  fixedByCategory: Map<string, number>;
};

function buildBucket(ref: Date): MonthBucket {
  const mStart = startOfMonthUtc(ref);
  const mEnd = endOfMonthUtc(ref);
  return {
    label: MONTH_LABELS_SHORT[mStart.getUTCMonth()] ?? "",
    year: mStart.getUTCFullYear(),
    month: mStart.getUTCMonth(),
    start: mStart,
    end: mEnd,
    fixedPaise: 0,
    variablePaise: 0,
    variableByCategory: new Map(),
    fixedByCategory: new Map(),
  };
}

function fillBucket(
  b: MonthBucket,
  fixedItems: PlainFixedExpense[],
  variableItems: PlainVariable[],
): void {
  for (const f of fixedItems) {
    if (!f.isActive) continue;
    const renewals = renewalsInRange(
      ruleOf(f),
      b.start,
      b.end,
      f.skippedCycles ?? null,
    );
    if (renewals.length === 0) continue;
    const sum = renewals.length * f.amountPaise;
    b.fixedPaise += sum;
    b.fixedByCategory.set(
      f.categoryId,
      (b.fixedByCategory.get(f.categoryId) ?? 0) + sum,
    );
  }
  for (const v of variableItems) {
    const d = new Date(v.date);
    if (d.getTime() < b.start.getTime() || d.getTime() > b.end.getTime()) continue;
    b.variablePaise += v.amountPaise;
    b.variableByCategory.set(
      v.categoryId,
      (b.variableByCategory.get(v.categoryId) ?? 0) + v.amountPaise,
    );
  }
}

function computeBreakdown(
  current: Map<string, number>,
  trailing: Map<string, number>[],
  categoryById: Map<string, PlainCategory>,
  type: "Fixed" | "Variable",
): CategoryWithTrend[] {
  const out: CategoryWithTrend[] = [];
  const ids = new Set<string>(current.keys());
  for (const m of trailing) for (const id of m.keys()) ids.add(id);

  for (const id of ids) {
    const cat = categoryById.get(id);
    if (!cat || cat.type !== type) continue;
    const paise = current.get(id) ?? 0;
    if (paise === 0) continue;
    const sumTrailing = trailing.reduce((s, m) => s + (m.get(id) ?? 0), 0);
    const avg = trailing.length > 0 ? Math.round(sumTrailing / trailing.length) : 0;
    const delta = paise - avg;
    const deltaPct = avg > 0 ? Math.round(((delta / avg) * 100) * 10) / 10 : null;
    out.push({
      categoryId: id,
      name: cat.name,
      color: cat.color,
      type: cat.type,
      paise,
      avgPaise: avg,
      deltaPaise: delta,
      deltaPct,
    });
  }

  out.sort((a, b) => b.paise - a.paise);
  return out;
}

function buildDailySpend(
  bucket: MonthBucket,
  fixedItems: PlainFixedExpense[],
  variableItems: PlainVariable[],
  payments: PlainPayment[],
  fixedById: Map<string, PlainFixedExpense>,
  paidCycleKeys: Set<string>,
  todayMidnightUtc: Date,
): MonthlyDailySpend {
  const byDate = new Map<string, DayDetail>();
  const ensure = (date: string): DayDetail => {
    let d = byDate.get(date);
    if (!d) {
      d = { date, totalPaise: 0, variableItems: [], fixedItems: [] };
      byDate.set(date, d);
    }
    return d;
  };

  for (const p of payments) {
    const paid = new Date(p.paidDate);
    if (
      paid.getTime() < bucket.start.getTime() ||
      paid.getTime() > bucket.end.getTime()
    )
      continue;
    const f = fixedById.get(p.fixedExpenseId);
    if (!f) continue;
    const d = ensure(toDateInputValue(paid));
    d.totalPaise += p.amountPaise;
    d.fixedItems.push({
      id: `pay-${p.id}`,
      name: f.name,
      amountPaise: p.amountPaise,
      categoryId: f.categoryId,
      kind: "paid",
    });
  }

  for (const f of fixedItems) {
    if (!f.isActive) continue;
    const renewals = renewalsInRange(
      ruleOf(f),
      bucket.start,
      bucket.end,
      f.skippedCycles ?? null,
    );
    for (const r of renewals) {
      if (r.getTime() < todayMidnightUtc.getTime()) continue;
      const cycleKey = `${f.id}:${toDateInputValue(r)}`;
      if (paidCycleKeys.has(cycleKey)) continue;
      const date = toDateInputValue(r);
      const d = ensure(date);
      d.totalPaise += f.amountPaise;
      d.fixedItems.push({
        id: `sch-${f.id}-${date}`,
        name: f.name,
        amountPaise: f.amountPaise,
        categoryId: f.categoryId,
        kind: "scheduled",
      });
    }
  }

  for (const v of variableItems) {
    const dt = new Date(v.date);
    if (
      dt.getTime() < bucket.start.getTime() ||
      dt.getTime() > bucket.end.getTime()
    )
      continue;
    const d = ensure(toDateInputValue(dt));
    d.totalPaise += v.amountPaise;
    d.variableItems.push({
      id: v.id,
      amountPaise: v.amountPaise,
      categoryId: v.categoryId,
      note: v.note,
    });
  }

  let totalPaise = 0;
  let maxDayPaise = 0;
  for (const d of byDate.values()) {
    totalPaise += d.totalPaise;
    if (d.totalPaise > maxDayPaise) maxDayPaise = d.totalPaise;
  }

  const days = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    label: bucket.label,
    year: bucket.year,
    month: bucket.month,
    daysInMonth: bucket.end.getUTCDate(),
    totalPaise,
    maxDayPaise,
    days,
  };
}

export async function fetchDashboardCore(): Promise<DashboardCoreData> {
  const user = await requireUser();
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const monthEnd = endOfMonthUtc(now);
  const lastMonthRef = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const lastMonthStart = startOfMonthUtc(lastMonthRef);
  const lastMonthEnd = endOfMonthUtc(lastMonthRef);
  const sixMonthsAgo = startOfMonthUtc(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)),
  );
  const threeMoBackStart = startOfMonthUtc(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)),
  );

  const fixedItemsPromise = listFixed(user.id);

  const monthRefs: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    monthRefs.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)),
    );
  }
  const monthIncomePromises = monthRefs.map((ref) =>
    incomeForMonthEnd(user.id, endOfMonthUtc(ref)),
  );

  const [
    settings,
    fixedItems,
    variableItems,
    categories,
    currentIncome,
    lastMonthIncome,
    savingsBalance,
    monthSurplusAlreadySwept,
    monthCoverAlreadyRecorded,
    savingsThisMonthDeltaPaise,
    monthIncomes,
    trailingThreeMoSavingsSum,
    savingsBalanceByGoalMap,
  ] = await Promise.all([
    getSettings(user.id),
    fixedItemsPromise,
    listVariable(user.id, {
      start: sixMonthsAgo,
      end: monthEnd,
      limit: 10_000,
    }),
    listCategories(user.id),
    incomeForMonthEnd(user.id, monthEnd),
    incomeForMonthEnd(user.id, lastMonthEnd),
    getSavingsBalance(user.id),
    hasMonthSurplus(user.id, lastMonthStart, lastMonthEnd),
    hasMonthCover(user.id, monthStart, monthEnd),
    sumSavingsInRange(user.id, monthStart, monthEnd),
    Promise.all(monthIncomePromises),
    sumSavingsInRange(user.id, threeMoBackStart, lastMonthEnd),
    getSavingsBalanceByGoal(user.id),
  ]);

  const savingsBalanceByGoal: Record<string, number> = {};
  for (const [k, v] of savingsBalanceByGoalMap) {
    savingsBalanceByGoal[k ?? ""] = v;
  }

  const todayMidnightUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const b = buildBucket(ref);
    fillBucket(b, fixedItems, variableItems);
    buckets.push(b);
  }
  const currentBucket = buckets[buckets.length - 1]!;

  const lastBucket = buildBucket(lastMonthRef);
  fillBucket(lastBucket, fixedItems, variableItems);

  const monthlyIncomePaise = currentIncome?.amountPaise ?? 0;
  const monthlyFixedPaise = currentBucket.fixedPaise;
  const monthlyVariablePaise = currentBucket.variablePaise;
  const freeCashPaise =
    monthlyIncomePaise - monthlyFixedPaise - monthlyVariablePaise;

  const today = now.getUTCDate();
  const daysInMonth = monthEnd.getUTCDate();
  const daysElapsed = Math.max(1, Math.min(today, daysInMonth));
  const dailyVariableBurn = monthlyVariablePaise / daysElapsed;
  const remainingDays = daysInMonth - daysElapsed;
  const projectedExtraVariable = Math.round(dailyVariableBurn * remainingDays);
  const projectedEndOfMonthFreeCashPaise =
    monthlyIncomePaise -
    monthlyFixedPaise -
    monthlyVariablePaise -
    projectedExtraVariable;

  // Forecast: at current burn, when does free cash hit zero?
  // null when free cash is already gone, when the projection ends positive
  // ("on track"), or when burn is zero. The date is clamped to month-end
  // since free-cash semantics reset at month boundaries.
  let projectedRunsOutAtIso: string | null = null;
  if (
    freeCashPaise > 0 &&
    projectedEndOfMonthFreeCashPaise < 0 &&
    dailyVariableBurn > 0
  ) {
    const daysFromToday = Math.ceil(freeCashPaise / dailyVariableBurn);
    const out = new Date(now.getTime());
    out.setUTCDate(out.getUTCDate() + daysFromToday);
    if (out.getTime() > monthEnd.getTime()) {
      projectedRunsOutAtIso = monthEnd.toISOString();
    } else {
      projectedRunsOutAtIso = out.toISOString();
    }
  }

  const statusCounts: FixedStatusCounts = {
    paid: 0,
    overdue: 0,
    upcoming: 0,
    inactive: 0,
    skipped: 0,
  };
  const overdue: PlainFixedExpense[] = [];
  const upcoming: PlainFixedExpense[] = [];
  const paid: PlainFixedExpense[] = [];
  const autoDebitNeedsConfirm: PlainFixedExpense[] = [];
  let remainingFixedPaise = 0;
  for (const f of fixedItems) {
    const status = deriveStatus(
      ruleOf(f),
      f.lastPaidDate ? new Date(f.lastPaidDate) : null,
      now,
      f.isActive,
      f.skippedCycles ?? null,
    );
    if (status === "paid") {
      statusCounts.paid++;
      paid.push(f);
    } else if (status === "overdue") {
      statusCounts.overdue++;
      overdue.push(f);
      if (f.isAutoDebit && f.isActive) autoDebitNeedsConfirm.push(f);
    } else if (status === "upcoming") {
      statusCounts.upcoming++;
      upcoming.push(f);
    } else if (status === "skipped") {
      statusCounts.skipped++;
    } else {
      statusCounts.inactive++;
    }

    if (!f.isActive) continue;
    const lastPaid = f.lastPaidDate ? new Date(f.lastPaidDate) : null;
    let countFrom = monthStart;
    if (lastPaid) {
      const bounds = cycleBoundsAt(ruleOf(f), lastPaid);
      if (bounds) {
        const dayAfterCycle = new Date(bounds.end.getTime() + 86_400_000);
        if (dayAfterCycle.getTime() > countFrom.getTime()) {
          countFrom = dayAfterCycle;
        }
      }
    }
    if (countFrom.getTime() <= monthEnd.getTime()) {
      const renewals = renewalsInRange(
        ruleOf(f),
        countFrom,
        monthEnd,
        f.skippedCycles ?? null,
      );
      remainingFixedPaise += renewals.length * f.amountPaise;
    }
  }
  const fixedHighlights = [...overdue, ...upcoming, ...paid].slice(0, 6);

  // listVariable returns items sorted by date desc, _id desc — no need
  // to re-sort the (potentially large) trailing-6-month list here.
  const recentVariable = variableItems.slice(0, 8);

  let pendingSweep: PendingSweep | null = null;
  if (!monthSurplusAlreadySwept) {
    const lastIncome = lastMonthIncome?.amountPaise ?? 0;
    const surplus = lastIncome - lastBucket.fixedPaise - lastBucket.variablePaise;
    if (surplus > 0) {
      pendingSweep = {
        monthLabel: `${MONTH_LABELS_LONG[lastMonthStart.getUTCMonth()]} ${lastMonthStart.getUTCFullYear()}`,
        monthStart: lastMonthStart.toISOString(),
        monthEnd: lastMonthEnd.toISOString(),
        surplusPaise: surplus,
      };
    }
  }

  let shortfallHint: ShortfallHint | null = null;
  if (
    !monthCoverAlreadyRecorded &&
    projectedEndOfMonthFreeCashPaise < 0 &&
    savingsBalance > 0
  ) {
    const shortfall = -projectedEndOfMonthFreeCashPaise;
    shortfallHint = {
      shortfallPaise: shortfall,
      balancePaise: savingsBalance,
      coverablePaise: Math.min(shortfall, savingsBalance),
    };
  }

  const trailingBuckets = buckets.slice(0, -1);
  const activeTrailingBuckets = trailingBuckets.filter(
    (b) => b.variablePaise > 0 || b.fixedPaise > 0,
  );
  const trailingMonthsForAvg = activeTrailingBuckets.length;
  const avgVariablePaise =
    trailingMonthsForAvg > 0
      ? Math.round(
          activeTrailingBuckets.reduce((s, b) => s + b.variablePaise, 0) /
            trailingMonthsForAvg,
        )
      : 0;

  const monthlyTotals: MonthlyTotal[] = buckets.map((b, i) => {
    const incomePaise = monthIncomes[i]?.amountPaise ?? 0;
    const freeCashPaise = incomePaise - b.fixedPaise - b.variablePaise;
    return {
      label: b.label,
      year: b.year,
      month: b.month,
      incomePaise,
      variablePaise: b.variablePaise,
      fixedPaise: b.fixedPaise,
      freeCashPaise,
    };
  });

  const todayIso = toDateInputValue(todayMidnightUtc);
  let todaySpendPaise = 0;
  for (const v of variableItems) {
    if (toDateInputValue(new Date(v.date)) === todayIso) {
      todaySpendPaise += v.amountPaise;
    }
  }

  const monthlySavingsAvgPaise = Math.round(trailingThreeMoSavingsSum / 3);
  const savingsGoalAmountPaise = settings.savingsGoal?.amountPaise ?? null;
  const savingsGoalTargetDate = settings.savingsGoal?.targetDate
    ? settings.savingsGoal.targetDate.toISOString()
    : null;

  return {
    currency: settings.defaultCurrency,
    locale: settings.locale,
    monthlyIncomePaise,
    monthlyFixedPaise,
    monthlyVariablePaise,
    remainingFixedPaise,
    avgVariablePaise,
    trailingMonthsForAvg,
    freeCashPaise,
    projectedEndOfMonthFreeCashPaise,
    projectedRunsOutAtIso,
    daysInMonth,
    daysElapsed,
    todaySpendPaise,
    monthlyTotals,
    statusCounts,
    fixedHighlights,
    recentVariable,
    categories,
    autoDebitNeedsConfirm,
    pendingSweep,
    shortfallHint,
    savingsBalance,
    savingsThisMonthDeltaPaise,
    savingsGoalAmountPaise,
    savingsGoalTargetDate,
    monthlySavingsAvgPaise,
    savingsGoals: settings.savingsGoals,
    savingsBalanceByGoal,
    spendingClimate: classifyClimate({
      monthlyIncomePaise,
      monthlyVariablePaise,
      avgVariablePaise,
      daysElapsed,
      daysInMonth,
      projectedFreeCashPaise: projectedEndOfMonthFreeCashPaise,
    }),
  };
}

export async function fetchDashboardCharts(): Promise<DashboardChartsData> {
  const user = await requireUser();
  const now = new Date();
  const monthEnd = endOfMonthUtc(now);
  const sixMonthsAgo = startOfMonthUtc(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)),
  );

  const fixedItemsPromise = listFixed(user.id);
  const paymentsPromise = fixedItemsPromise.then((items) =>
    listPaymentsForRange(
      user.id,
      items.map((f) => f.id),
      sixMonthsAgo,
      monthEnd,
    ),
  );

  const [fixedItems, variableItems, categories, payments] = await Promise.all([
    fixedItemsPromise,
    listVariable(user.id, {
      start: sixMonthsAgo,
      end: monthEnd,
      limit: 10_000,
    }),
    listCategories(user.id),
    paymentsPromise,
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const fixedById = new Map(fixedItems.map((f) => [f.id, f] as const));

  const paidCycleKeys = new Set<string>();
  for (const p of payments) {
    const f = fixedById.get(p.fixedExpenseId);
    if (!f) continue;
    const bounds = cycleBoundsAt(ruleOf(f), new Date(p.paidDate));
    if (bounds) {
      paidCycleKeys.add(`${f.id}:${toDateInputValue(bounds.start)}`);
    }
  }

  const todayMidnightUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const b = buildBucket(ref);
    fillBucket(b, fixedItems, variableItems);
    buckets.push(b);
  }

  const monthlyBreakdowns: MonthlyBreakdown[] = buckets.map((bucket, i) => {
    const trailing = buckets.slice(0, i);
    return {
      label: bucket.label,
      year: bucket.year,
      month: bucket.month,
      trailingCount: trailing.length,
      variable: computeBreakdown(
        bucket.variableByCategory,
        trailing.map((b) => b.variableByCategory),
        categoryById,
        "Variable",
      ),
      fixed: computeBreakdown(
        bucket.fixedByCategory,
        trailing.map((b) => b.fixedByCategory),
        categoryById,
        "Fixed",
      ),
    };
  });

  const dailySpend = buckets.map((b) =>
    buildDailySpend(
      b,
      fixedItems,
      variableItems,
      payments,
      fixedById,
      paidCycleKeys,
      todayMidnightUtc,
    ),
  );

  return { monthlyBreakdowns, dailySpend };
}

