"use server";

import { revalidatePath } from "next/cache";
import { categoryInputSchema } from "./schema";
import {
  createCategory,
  deleteCategoryIfUnused,
  listCategories,
  updateCategory,
  type PlainCategory,
} from "@/db/repositories/categories";
import { requireUser } from "@/lib/auth/server";

type Ok<T> = { ok: true; data: T };
type Fail = {
  ok: false;
  error: { code: string; message: string; field?: string | undefined };
};
export type ActionResult<T> = Ok<T> | Fail;

function isDuplicateKey(err: unknown): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  return e?.code === 11000 && Boolean(e.keyPattern?.name);
}

function fromUnknown(err: unknown): Fail {
  if (isDuplicateKey(err)) {
    return {
      ok: false,
      error: {
        code: "DUPLICATE_NAME",
        field: "name",
        message: "A category with this name already exists for that type",
      },
    };
  }
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

export async function fetchCategories(): Promise<PlainCategory[]> {
  const user = await requireUser();
  return listCategories(user.id);
}

export async function createCategoryAction(
  raw: unknown,
): Promise<ActionResult<PlainCategory>> {
  const user = await requireUser();
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createCategory(user.id, parsed.data);
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { ok: true, data: created };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function updateCategoryAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<PlainCategory>> {
  const user = await requireUser();
  const parsed = categoryInputSchema.partial().safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateCategory(user.id, id, parsed.data);
    if (!updated) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Category not found" } };
    }
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  try {
    const result = await deleteCategoryIfUnused(user.id, id);
    if (result.ok) {
      revalidatePath("/categories");
      revalidatePath("/dashboard");
      return { ok: true, data: { id } };
    }
    if (result.reason === "NOT_FOUND") {
      return { ok: false, error: { code: "NOT_FOUND", message: "Category not found" } };
    }
    const { fixedExpenseCount, variableExpenseCount } = result.usage;
    const parts: string[] = [];
    if (fixedExpenseCount > 0)
      parts.push(`${fixedExpenseCount} fixed expense${fixedExpenseCount === 1 ? "" : "s"}`);
    if (variableExpenseCount > 0)
      parts.push(`${variableExpenseCount} variable expense${variableExpenseCount === 1 ? "" : "s"}`);
    return {
      ok: false,
      error: {
        code: "CATEGORY_IN_USE",
        message: `Linked to ${parts.join(" and ")}. Reassign or delete those first.`,
      },
    };
  } catch (err) {
    return fromUnknown(err);
  }
}
