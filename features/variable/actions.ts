"use server";

import { revalidatePath } from "next/cache";
import { variableInputSchema } from "./schema";
import {
  createVariable,
  deleteVariable,
  listVariableWithCount,
  updateVariable,
  type PlainVariable,
} from "@/db/repositories/variable";
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

export type VariableFiltersInput = {
  start?: string | null;
  end?: string | null;
  categoryIds?: string[];
  text?: string;
  page?: number;
  pageSize?: number;
};

export type VariablePage = {
  items: PlainVariable[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchVariable(
  filters: VariableFiltersInput,
): Promise<VariablePage> {
  const user = await requireUser();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 20));
  const start = filters.start ? new Date(filters.start) : undefined;
  const end = filters.end ? new Date(filters.end) : undefined;

  const { items, total } = await listVariableWithCount(user.id, {
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    ...(filters.categoryIds?.length ? { categoryIds: filters.categoryIds } : {}),
    ...(filters.text ? { text: filters.text } : {}),
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  return { items, total, page, pageSize };
}

export async function createVariableAction(
  raw: unknown,
): Promise<ActionResult<PlainVariable>> {
  const user = await requireUser();
  const parsed = variableInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createVariable(user.id, parsed.data);
    revalidatePath("/variable");
    revalidatePath("/dashboard");
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function updateVariableAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<PlainVariable>> {
  const user = await requireUser();
  const parsed = variableInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateVariable(user.id, id, parsed.data);
    if (!updated) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Expense not found" } };
    }
    revalidatePath("/variable");
    revalidatePath("/dashboard");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function deleteVariableAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    const ok = await deleteVariable(user.id, id);
    if (!ok) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Expense not found" } };
    }
    revalidatePath("/variable");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    return fromUnknown(err);
  }
}
