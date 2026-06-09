"use server";

import { revalidatePath } from "next/cache";
import { incomeInputSchema } from "./schema";
import {
  createIncome,
  deleteIncome,
  listIncomeEntries,
  updateIncome,
  type PlainIncomeEntry,
} from "@/db/repositories/income";
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

export async function fetchIncome(): Promise<PlainIncomeEntry[]> {
  const user = await requireUser();
  return listIncomeEntries(user.id);
}

export async function createIncomeAction(
  raw: unknown,
): Promise<ActionResult<PlainIncomeEntry>> {
  const user = await requireUser();
  const parsed = incomeInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createIncome(user.id, parsed.data);
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function updateIncomeAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<PlainIncomeEntry>> {
  const user = await requireUser();
  const parsed = incomeInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateIncome(user.id, id, parsed.data);
    if (!updated) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Entry not found" } };
    }
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function deleteIncomeAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    const ok = await deleteIncome(user.id, id);
    if (!ok) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Entry not found" } };
    }
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    return fromUnknown(err);
  }
}
