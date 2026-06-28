"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { variableInputSchema } from "./schema";
import {
  bulkDeleteVariable,
  bulkSetCategory,
  createVariable,
  deleteVariable,
  listVariable,
  listVariableWithCount,
  updateVariable,
  variableSummary,
  type PlainVariable,
} from "@/db/repositories/variable";
import { getCategoryById, listCategories } from "@/db/repositories/categories";
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
  monthTotalPaise: number;
  todayTotalPaise: number;
  todayCount: number;
};

const objectIdShape = z.string().regex(/^[0-9a-fA-F]{24}$/);
const dateLike = z
  .string()
  .min(1)
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const variableFiltersSchema = z.object({
  start: dateLike.optional().nullable(),
  end: dateLike.optional().nullable(),
  categoryIds: z.array(objectIdShape).max(50).optional(),
  text: z.string().max(200).optional(),
  page: z.number().int().min(1).max(10_000).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export async function fetchVariable(
  filters: VariableFiltersInput,
): Promise<VariablePage> {
  const user = await requireUser();
  const parsed = variableFiltersSchema.safeParse(filters);
  const safe = parsed.success ? parsed.data : {};
  const page = Math.max(1, safe.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, safe.pageSize ?? 20));
  const start = safe.start ? new Date(safe.start) : undefined;
  const end = safe.end ? new Date(safe.end) : undefined;

  const [{ items, total }, summary] = await Promise.all([
    listVariableWithCount(user.id, {
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
      ...(safe.categoryIds?.length ? { categoryIds: safe.categoryIds } : {}),
      ...(safe.text ? { text: safe.text } : {}),
      skip: (page - 1) * pageSize,
      limit: pageSize,
    }),
    variableSummary(user.id),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    monthTotalPaise: summary.monthTotalPaise,
    todayTotalPaise: summary.todayTotalPaise,
    todayCount: summary.todayCount,
  };
}

export async function createVariableAction(
  raw: unknown,
): Promise<ActionResult<PlainVariable>> {
  const user = await requireUser();
  const parsed = variableInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const created = await createVariable(user.id, {
      ...parsed.data,
      tags: parsed.data.tags ?? [],
    });
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
    const updated = await updateVariable(user.id, id, {
      ...parsed.data,
      tags: parsed.data.tags ?? [],
    });
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

export async function bulkDeleteVariableAction(
  ids: string[],
): Promise<ActionResult<{ deleted: number }>> {
  const user = await requireUser();
  if (ids.length === 0) return { ok: true, data: { deleted: 0 } };
  try {
    const deleted = await bulkDeleteVariable(user.id, ids);
    revalidatePath("/variable");
    revalidatePath("/dashboard");
    return { ok: true, data: { deleted } };
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function bulkSetCategoryAction(
  ids: string[],
  categoryId: string,
): Promise<ActionResult<{ updated: number }>> {
  const user = await requireUser();
  if (ids.length === 0) return { ok: true, data: { updated: 0 } };
  try {
    // Reject if the category doesn't belong to the user — prevents
    // cross-tenant contamination on a forged categoryId.
    const cat = await getCategoryById(user.id, categoryId);
    if (!cat) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Category not found" },
      };
    }
    const updated = await bulkSetCategory(user.id, ids, categoryId);
    revalidatePath("/variable");
    revalidatePath("/dashboard");
    return { ok: true, data: { updated } };
  } catch (err) {
    return fromUnknown(err);
  }
}

const TAX_TAG_PATTERNS = ["tax", "tax-deductible", "deductible"];

function isTaxTagged(v: PlainVariable): boolean {
  if (!v.tags) return false;
  return v.tags.some((t) =>
    TAX_TAG_PATTERNS.includes(t.toLowerCase().replace(/\s+/g, "-")),
  );
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV of every tax-flagged variable expense in the given year.
 * Designed for hand-off to a tax preparer or for personal records —
 * returns the CSV string + a suggested filename so the client can
 * trigger the download without round-tripping a Blob.
 *
 * "Tax-flagged" means the expense has a `tax`, `tax-deductible`, or
 * `deductible` tag (case-insensitive). We don't introduce a separate
 * boolean column — tags are already the user's marker mechanism.
 */
export async function exportTaxDeductibleCsvAction(
  year: number,
): Promise<ActionResult<{ csv: string; filename: string; rowCount: number }>> {
  const user = await requireUser();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Invalid year" },
    };
  }
  try {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const [items, categories] = await Promise.all([
      listVariable(user.id, { start, end, limit: 50_000 }),
      listCategories(user.id),
    ]);
    const categoryById = new Map(categories.map((c) => [c.id, c.name] as const));
    const filtered = items.filter(isTaxTagged);

    const lines = [
      ["Date", "Amount", "Currency", "Category", "Note", "Tags"]
        .map(csvEscape)
        .join(","),
    ];
    for (const v of filtered) {
      const date = new Date(v.date).toISOString().slice(0, 10);
      const amount = (v.amountPaise / 100).toFixed(2);
      const category = categoryById.get(v.categoryId) ?? "Unknown";
      lines.push(
        [
          date,
          amount,
          v.currency,
          category,
          v.note ?? "",
          v.tags.join("; "),
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    return {
      ok: true,
      data: {
        csv: lines.join("\n"),
        filename: `pocketbook-tax-${year}.csv`,
        rowCount: filtered.length,
      },
    };
  } catch (err) {
    return fromUnknown(err);
  }
}
