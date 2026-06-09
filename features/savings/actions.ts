"use server";

import { revalidatePath } from "next/cache";
import { savingsInputSchema } from "./schema";
import {
  createSavings,
  deleteSavings,
  getSavingsBalance,
  hasMonthCover,
  hasMonthSurplus,
  listSavings,
  type PlainSavingsEntry,
} from "@/db/repositories/savings";
import { listFixed } from "@/db/repositories/fixed";
import { listVariable } from "@/db/repositories/variable";
import { incomeForMonthEnd } from "@/db/repositories/income";
import {
  endOfMonthUtc,
  startOfMonthUtc,
  todayUtc,
  utcMidnight,
} from "@/lib/format/date";
import { renewalsInRange, type Rule } from "@/features/fixed/lib/billing";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainVariable } from "@/db/repositories/variable";
import { requireUser } from "@/lib/auth/server";

type Ok<T> = { ok: true; data: T };
type Fail = {
  ok: false;
  error: { code: string; message: string; field?: string | undefined };
};
export type ActionResult<T> = Ok<T> | Fail;

function fromUnknown(err: unknown): Fail {
  const message = err instanceof Error ? err.message : "Unexpected error";
  return { ok: false, error: { code: "UNKNOWN", message } };
}

function fromValidation(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Fail {
  const first = error.issues[0];
  return {
    ok: false,
    error: {
      code: "VALIDATION",
      field: typeof first?.path[0] === "string" ? first.path[0] : undefined,
      message: first?.message ?? "Invalid input",
    },
  };
}

function revalidateAll() {
  revalidatePath("/savings");
  revalidatePath("/dashboard");
}

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
}

function sumFixedRenewalsInRange(
  fixedItems: PlainFixedExpense[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const f of fixedItems) {
    if (!f.isActive) continue;
    const r = renewalsInRange(ruleOf(f), start, end);
    total += r.length * f.amountPaise;
  }
  return total;
}

function sumVariableInRange(
  items: PlainVariable[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const v of items) {
    const d = new Date(v.date);
    if (d.getTime() >= start.getTime() && d.getTime() <= end.getTime()) {
      total += v.amountPaise;
    }
  }
  return total;
}

export async function fetchSavings(): Promise<PlainSavingsEntry[]> {
  const user = await requireUser();
  return listSavings(user.id);
}

export async function fetchSavingsBalance(): Promise<number> {
  const user = await requireUser();
  return getSavingsBalance(user.id);
}

export async function createDepositAction(
  raw: unknown,
): Promise<ActionResult<PlainSavingsEntry>> {
  const user = await requireUser();
  const parsed = savingsInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createSavings(user.id, {
      amountPaise: parsed.data.amountPaise,
      effectiveDate: parsed.data.effectiveDate,
      note: parsed.data.note,
      kind: "manual_deposit",
    });
    revalidateAll();
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function createWithdrawalAction(
  raw: unknown,
): Promise<ActionResult<PlainSavingsEntry>> {
  const user = await requireUser();
  const parsed = savingsInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const balance = await getSavingsBalance(user.id);
    if (balance - parsed.data.amountPaise < 0) {
      return {
        ok: false,
        error: {
          code: "INSUFFICIENT_BALANCE",
          field: "amountPaise",
          message: "Withdrawal exceeds the current Savings balance.",
        },
      };
    }
    const created = await createSavings(user.id, {
      amountPaise: -parsed.data.amountPaise,
      effectiveDate: parsed.data.effectiveDate,
      note: parsed.data.note,
      kind: "manual_withdrawal",
    });
    revalidateAll();
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function deleteSavingsAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    const ok = await deleteSavings(user.id, id);
    if (!ok) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Entry not found" } };
    }
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export type PendingSweep = {
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  surplusPaise: number;
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function fetchPendingSweep(): Promise<PendingSweep | null> {
  const user = await requireUser();
  const now = new Date();
  const lastMonthRef = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const monthStart = startOfMonthUtc(lastMonthRef);
  const monthEnd = endOfMonthUtc(lastMonthRef);

  if (await hasMonthSurplus(user.id, monthStart, monthEnd)) return null;

  const [income, fixed, variable] = await Promise.all([
    incomeForMonthEnd(user.id, monthEnd),
    listFixed(user.id),
    listVariable(user.id, { start: monthStart, end: monthEnd, limit: 50_000 }),
  ]);

  const incomePaise = income?.amountPaise ?? 0;
  const fixedPaise = sumFixedRenewalsInRange(fixed, monthStart, monthEnd);
  const variablePaise = sumVariableInRange(variable, monthStart, monthEnd);
  const surplus = incomePaise - fixedPaise - variablePaise;

  if (surplus <= 0) return null;

  return {
    monthLabel: `${MONTH_LABELS[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`,
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    surplusPaise: surplus,
  };
}

export async function sweepMonthSurplusAction(
  pending: PendingSweep,
): Promise<ActionResult<PlainSavingsEntry>> {
  const user = await requireUser();
  try {
    const monthStart = new Date(pending.monthStart);
    const monthEnd = new Date(pending.monthEnd);
    if (await hasMonthSurplus(user.id, monthStart, monthEnd)) {
      return {
        ok: false,
        error: {
          code: "ALREADY_SWEPT",
          message: "This month has already been swept.",
        },
      };
    }
    if (!Number.isInteger(pending.surplusPaise) || pending.surplusPaise <= 0) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "No surplus to sweep." },
      };
    }
    const created = await createSavings(user.id, {
      amountPaise: pending.surplusPaise,
      effectiveDate: monthEnd,
      note: `Month-end sweep — ${pending.monthLabel}`,
      kind: "month_surplus",
    });
    revalidateAll();
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export type ShortfallHint = {
  shortfallPaise: number;
  balancePaise: number;
  coverablePaise: number;
};

export async function fetchShortfallHint(): Promise<ShortfallHint | null> {
  const user = await requireUser();
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const monthEnd = endOfMonthUtc(now);

  if (await hasMonthCover(user.id, monthStart, monthEnd)) return null;

  const [income, fixed, variable, balance] = await Promise.all([
    incomeForMonthEnd(user.id, monthEnd),
    listFixed(user.id),
    listVariable(user.id, { start: monthStart, end: monthEnd, limit: 50_000 }),
    getSavingsBalance(user.id),
  ]);

  const today = utcMidnight(todayUtc()).getUTCDate();
  const daysInMonth = monthEnd.getUTCDate();
  const daysElapsed = Math.max(1, Math.min(today, daysInMonth));

  const incomePaise = income?.amountPaise ?? 0;
  const fixedPaise = sumFixedRenewalsInRange(fixed, monthStart, monthEnd);
  const variablePaise = sumVariableInRange(variable, monthStart, monthEnd);
  const dailyBurn = variablePaise / daysElapsed;
  const remainingDays = daysInMonth - daysElapsed;
  const projectedExtra = Math.round(dailyBurn * remainingDays);
  const projectedFreeCash =
    incomePaise - fixedPaise - variablePaise - projectedExtra;

  if (projectedFreeCash >= 0) return null;
  if (balance <= 0) return null;

  const shortfall = -projectedFreeCash;
  return {
    shortfallPaise: shortfall,
    balancePaise: balance,
    coverablePaise: Math.min(shortfall, balance),
  };
}

export async function coverMonthShortfallAction(
  amountPaise: number,
): Promise<ActionResult<PlainSavingsEntry>> {
  const user = await requireUser();
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Amount must be positive." },
    };
  }
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const monthEnd = endOfMonthUtc(now);
  if (await hasMonthCover(user.id, monthStart, monthEnd)) {
    return {
      ok: false,
      error: {
        code: "ALREADY_COVERED",
        message: "Cover already recorded for this month.",
      },
    };
  }
  try {
    const balance = await getSavingsBalance(user.id);
    if (balance < amountPaise) {
      return {
        ok: false,
        error: {
          code: "INSUFFICIENT_BALANCE",
          message: "Cover exceeds the current Savings balance.",
        },
      };
    }
    const created = await createSavings(user.id, {
      amountPaise: -amountPaise,
      effectiveDate: todayUtc(),
      note: "Cover for projected shortfall this month",
      kind: "month_cover",
    });
    revalidateAll();
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}
