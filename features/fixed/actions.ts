"use server";

import { revalidatePath } from "next/cache";
import { fixedInputSchema } from "./schema";
import {
  addSkippedCycle,
  createFixed,
  deleteFixed,
  getFixedById,
  listFixed,
  removeSkippedCycle,
  setLastPaidDate,
  updateFixed,
  type PlainFixedExpense,
} from "@/db/repositories/fixed";
import {
  bulkRecordPayments,
  createPayment,
  listPaymentsFor,
  listPaymentsForRange,
  removePaymentAndResync,
  setPaymentUsage,
  unmarkLatestPayment,
  type PlainPayment,
} from "@/db/repositories/payments";
import {
  cycleBoundsAt,
  deriveStatus,
  ruleOf,
  utcStartOfDay,
} from "./lib/billing";
import { endOfMonthUtc, startOfMonthUtc } from "@/lib/format/date";
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

function fromValidation(error: { issues: { path: PropertyKey[]; message: string }[] }): Fail {
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
  revalidatePath("/fixed");
  revalidatePath("/dashboard");
}

export async function fetchFixed(): Promise<PlainFixedExpense[]> {
  const user = await requireUser();
  return listFixed(user.id);
}

/**
 * Payments recorded in the current calendar month for the given fixed
 * expenses. Powers the "This month" hero card's paid/remaining numbers.
 */
export async function fetchFixedMonthPayments(
  fixedIds: string[],
): Promise<PlainPayment[]> {
  const user = await requireUser();
  if (fixedIds.length === 0) return [];
  const now = new Date();
  const start = startOfMonthUtc(now);
  const end = endOfMonthUtc(now);
  return listPaymentsForRange(user.id, fixedIds, start, end);
}

export async function createFixedAction(
  raw: unknown,
): Promise<ActionResult<PlainFixedExpense>> {
  const user = await requireUser();
  const parsed = fixedInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createFixed(user.id, { ...parsed.data, lastPaidDate: null });
    revalidateAll();
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function updateFixedAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<PlainFixedExpense>> {
  const user = await requireUser();
  const parsed = fixedInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateFixed(user.id, id, parsed.data);
    if (!updated) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    revalidateAll();
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function deleteFixedAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    const ok = await deleteFixed(user.id, id);
    if (!ok) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function setActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult<PlainFixedExpense>> {
  const user = await requireUser();
  try {
    const updated = await updateFixed(user.id, id, { isActive });
    if (!updated) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    revalidateAll();
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function markPaidAction(
  id: string,
): Promise<ActionResult<{ fixed: PlainFixedExpense; payment: PlainPayment }>> {
  const user = await requireUser();
  try {
    const f = await getFixedById(user.id, id);
    if (!f) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    const today = utcStartOfDay(new Date());
    const payment = await createPayment(user.id, {
      fixedExpenseId: id,
      paidDate: today,
      amountPaise: f.amountPaise,
      note: null,
    });
    const updated = await setLastPaidDate(user.id, id, today);
    if (!updated) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Fixed expense not found" } };
    }
    revalidateAll();
    return { ok: true, data: { fixed: updated, payment } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function unmarkPaidAction(
  id: string,
): Promise<ActionResult<{ fixed: PlainFixedExpense }>> {
  const user = await requireUser();
  try {
    const { deleted } = await unmarkLatestPayment(user.id, id);
    if (!deleted) {
      return {
        ok: false,
        error: { code: "NO_PAYMENTS", message: "No payments to undo" },
      };
    }
    const updated = await getFixedById(user.id, id);
    if (!updated) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Fixed expense not found" } };
    }
    revalidateAll();
    return { ok: true, data: { fixed: updated } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function confirmAutoDebitAction(
  ids: string[],
): Promise<ActionResult<{ confirmed: number }>> {
  const user = await requireUser();
  try {
    if (ids.length === 0) return { ok: true, data: { confirmed: 0 } };
    // Fetch all candidates in one query and filter in memory. The
    // status check guards against double-confirms when the same set of
    // ids is submitted twice (e.g. retry after a flaky network).
    const today = utcStartOfDay(new Date());
    const idSet = new Set(ids);
    const all = await listFixed(user.id, { activeOnly: true });
    const items = all
      .filter((f) => idSet.has(f.id))
      .filter((f) => {
        const status = deriveStatus(
          ruleOf(f),
          f.lastPaidDate ? new Date(f.lastPaidDate) : null,
          today,
          f.isActive,
          f.skippedCycles ?? null,
        );
        return status === "overdue";
      });
    if (items.length === 0) return { ok: true, data: { confirmed: 0 } };
    const { inserted } = await bulkRecordPayments(
      user.id,
      items.map((f) => ({
        fixedExpenseId: f.id,
        amountPaise: f.amountPaise,
        note: "Auto-debit confirmed",
      })),
      today,
    );
    revalidateAll();
    return { ok: true, data: { confirmed: inserted } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function listPaymentsAction(
  fixedExpenseId: string,
): Promise<PlainPayment[]> {
  const user = await requireUser();
  return listPaymentsFor(user.id, fixedExpenseId);
}

export async function deletePaymentAction(
  paymentId: string,
  fixedExpenseId: string,
): Promise<ActionResult<{ id: string; lastPaidDate: Date | null }>> {
  const user = await requireUser();
  try {
    const { deleted, nextPaidDate } = await removePaymentAndResync(
      user.id,
      paymentId,
      fixedExpenseId,
    );
    if (!deleted) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Payment not found" },
      };
    }
    revalidateAll();
    return {
      ok: true,
      data: { id: paymentId, lastPaidDate: nextPaidDate },
    };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function fetchAutoDebitNeedsConfirm(): Promise<PlainFixedExpense[]> {
  const user = await requireUser();
  const all = await listFixed(user.id, { activeOnly: true });
  const now = new Date();
  return all.filter((f) => {
    if (!f.isAutoDebit) return false;
    const status = deriveStatus(
      ruleOf(f),
      f.lastPaidDate ? new Date(f.lastPaidDate) : null,
      now,
      f.isActive,
      f.skippedCycles ?? null,
    );
    return status === "overdue";
  });
}

export async function skipCycleAction(
  id: string,
): Promise<ActionResult<{ fixed: PlainFixedExpense; cycleStart: Date }>> {
  const user = await requireUser();
  try {
    const f = await getFixedById(user.id, id);
    if (!f) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    const today = utcStartOfDay(new Date());
    const bounds = cycleBoundsAt(ruleOf(f), today);
    if (!bounds) {
      return {
        ok: false,
        error: {
          code: "NO_CYCLE",
          message: "No active cycle to skip right now",
        },
      };
    }
    const updated = await addSkippedCycle(user.id, id, bounds.start);
    if (!updated) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    revalidateAll();
    return { ok: true, data: { fixed: updated, cycleStart: bounds.start } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function unskipCycleAction(
  id: string,
): Promise<ActionResult<{ fixed: PlainFixedExpense; cycleStart: Date }>> {
  const user = await requireUser();
  try {
    const f = await getFixedById(user.id, id);
    if (!f) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    const today = utcStartOfDay(new Date());
    const bounds = cycleBoundsAt(ruleOf(f), today);
    if (!bounds) {
      return {
        ok: false,
        error: {
          code: "NO_CYCLE",
          message: "No active cycle to un-skip",
        },
      };
    }
    const updated = await removeSkippedCycle(user.id, id, bounds.start);
    if (!updated) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Fixed expense not found" },
      };
    }
    revalidateAll();
    return { ok: true, data: { fixed: updated, cycleStart: bounds.start } };
  } catch (err) {
    return fromUnknown(err);
  }
}

/**
 * Record whether a specific past payment was actually used. Feeds the
 * subscription-review deck and (eventually) recurring-anomaly detection.
 */
export async function setPaymentUsageAction(
  paymentId: string,
  used: boolean,
): Promise<ActionResult<{ payment: PlainPayment }>> {
  const user = await requireUser();
  try {
    const updated = await setPaymentUsage(user.id, paymentId, used);
    if (!updated) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Payment not found" },
      };
    }
    revalidatePath("/dashboard");
    revalidatePath("/fixed");
    return { ok: true, data: { payment: updated } };
  } catch (err) {
    return fromUnknown(err);
  }
}

/**
 * Recent payments (last 14 days) that haven't been answered yet —
 * surfaced on the dashboard as quiet "Did you use this?" prompts.
 */
export async function fetchPendingUsagePrompts(): Promise<
  { payment: PlainPayment; fixed: PlainFixedExpense }[]
> {
  const user = await requireUser();
  const fixed = await listFixed(user.id, { activeOnly: true });
  if (fixed.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() - 14 * 86_400_000);
  const ids = fixed.map((f) => f.id);
  const payments = await listPaymentsForRange(user.id, ids, cutoff, now);

  // Only pending (null) and only the most recent per fixed-expense.
  const byFixed = new Map<string, PlainPayment>();
  for (const p of payments) {
    if (p.usedThisCycle !== null) continue;
    const prev = byFixed.get(p.fixedExpenseId);
    if (!prev || new Date(p.paidDate) > new Date(prev.paidDate)) {
      byFixed.set(p.fixedExpenseId, p);
    }
  }

  const byId = new Map(fixed.map((f) => [f.id, f] as const));
  return [...byFixed.values()]
    .map((p) => ({ payment: p, fixed: byId.get(p.fixedExpenseId)! }))
    .filter((x) => Boolean(x.fixed));
}
