import "server-only";
import { listCategories, type PlainCategory } from "@/db/repositories/categories";
import { listFixed, type PlainFixedExpense } from "@/db/repositories/fixed";
import { incomeForMonthEnd } from "@/db/repositories/income";
import { listVariable, type PlainVariable } from "@/db/repositories/variable";
import {
  getSavingsBalance,
  hasMonthCover,
  hasMonthSurplus,
} from "@/db/repositories/savings";
import { getSettings } from "@/db/repositories/settings";
import {
  deriveStatus,
  renewalsInRange,
  type Rule,
} from "@/features/fixed/lib/billing";
import { endOfMonthUtc, startOfMonthUtc } from "@/lib/format/date";
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

export type DashboardData = {
  currency: string;
  locale: string;
  monthlyIncomePaise: number;
  monthlyFixedPaise: number;
  monthlyVariablePaise: number;
  freeCashPaise: number;
  projectedEndOfMonthFreeCashPaise: number;
  daysInMonth: number;
  daysElapsed: number;
  monthlyBreakdowns: MonthlyBreakdown[];
  statusCounts: FixedStatusCounts;
  fixedHighlights: PlainFixedExpense[];
  recentVariable: PlainVariable[];
  categories: PlainCategory[];
  autoDebitNeedsConfirm: PlainFixedExpense[];
  pendingSweep: PendingSweep | null;
  shortfallHint: ShortfallHint | null;
  savingsBalance: number;
};

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
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
    const renewals = renewalsInRange(ruleOf(f), b.start, b.end);
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

export async function fetchDashboard(): Promise<DashboardData> {
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
  ] = await Promise.all([
    getSettings(user.id),
    listFixed(user.id),
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
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));

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

  const statusCounts: FixedStatusCounts = {
    paid: 0,
    overdue: 0,
    upcoming: 0,
    inactive: 0,
  };
  const overdue: PlainFixedExpense[] = [];
  const upcoming: PlainFixedExpense[] = [];
  const paid: PlainFixedExpense[] = [];
  const autoDebitNeedsConfirm: PlainFixedExpense[] = [];
  for (const f of fixedItems) {
    const status = deriveStatus(
      ruleOf(f),
      f.lastPaidDate ? new Date(f.lastPaidDate) : null,
      now,
      f.isActive,
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
    } else {
      statusCounts.inactive++;
    }
  }
  const fixedHighlights = [...overdue, ...upcoming, ...paid].slice(0, 6);

  const recentVariable = [...variableItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

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

  return {
    currency: settings.defaultCurrency,
    locale: settings.locale,
    monthlyIncomePaise,
    monthlyFixedPaise,
    monthlyVariablePaise,
    freeCashPaise,
    projectedEndOfMonthFreeCashPaise,
    daysInMonth,
    daysElapsed,
    monthlyBreakdowns,
    statusCounts,
    fixedHighlights,
    recentVariable,
    categories,
    autoDebitNeedsConfirm,
    pendingSweep,
    shortfallHint,
    savingsBalance,
  };
}
