"use server";

import { revalidatePath } from "next/cache";
import { fixedInputSchema } from "./schema";
import {
  createFixed,
  deleteFixed,
  getFixedById,
  listFixed,
  setLastPaidDate,
  updateFixed,
  type PlainFixedExpense,
} from "@/db/repositories/fixed";
import {
  createPayment,
  deletePayment,
  getMostRecentPaymentFor,
  listPaymentsFor,
  type PlainPayment,
} from "@/db/repositories/payments";
import { utcStartOfDay, deriveStatus, type Rule } from "./lib/billing";
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

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
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
    const mostRecent = await getMostRecentPaymentFor(user.id, id);
    if (!mostRecent) {
      return {
        ok: false,
        error: { code: "NO_PAYMENTS", message: "No payments to undo" },
      };
    }
    await deletePayment(user.id, mostRecent.id);
    const next = await getMostRecentPaymentFor(user.id, id);
    const updated = await setLastPaidDate(user.id, id, next ? next.paidDate : null);
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
    let confirmed = 0;
    for (const id of ids) {
      const f = await getFixedById(user.id, id);
      if (!f) continue;
      const today = utcStartOfDay(new Date());
      await createPayment(user.id, {
        fixedExpenseId: id,
        paidDate: today,
        amountPaise: f.amountPaise,
        note: "Auto-debit confirmed",
      });
      await setLastPaidDate(user.id, id, today);
      confirmed++;
    }
    revalidateAll();
    return { ok: true, data: { confirmed } };
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
    await deletePayment(user.id, paymentId);
    const next = await getMostRecentPaymentFor(user.id, fixedExpenseId);
    const updated = await setLastPaidDate(
      user.id,
      fixedExpenseId,
      next ? next.paidDate : null,
    );
    revalidateAll();
    return {
      ok: true,
      data: {
        id: paymentId,
        lastPaidDate: updated?.lastPaidDate ?? null,
      },
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
    );
    return status === "overdue";
  });
}
