"use server";

import {
  listIncomeEntries,
  type PlainIncomeEntry,
} from "@/db/repositories/income";
import {
  listFixed,
  type PlainFixedExpense,
} from "@/db/repositories/fixed";
import {
  listVariable,
  type PlainVariable,
} from "@/db/repositories/variable";
import {
  listAllPayments,
  type PlainPayment,
} from "@/db/repositories/payments";
import {
  listSavings,
  type PlainSavingsEntry,
} from "@/db/repositories/savings";
import {
  listCategories,
  type PlainCategory,
} from "@/db/repositories/categories";
import { getSettings } from "@/db/repositories/settings";
import { requireUser } from "@/lib/auth/server";

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; error: { code: string; message: string } };
type ActionResult<T> = Ok<T> | Fail;

function fromUnknown(err: unknown): Fail {
  const message = err instanceof Error ? err.message : "Export failed";
  return { ok: false, error: { code: "EXPORT_FAILED", message } };
}

export type ExportDomain =
  | "income"
  | "fixed"
  | "variable"
  | "payments"
  | "savings"
  | "categories";

type AllUserData = {
  exportedAt: string;
  schema: "1.0";
  income: PlainIncomeEntry[];
  fixed: PlainFixedExpense[];
  variable: PlainVariable[];
  payments: PlainPayment[];
  savings: PlainSavingsEntry[];
  categories: PlainCategory[];
  settings: Awaited<ReturnType<typeof getSettings>>;
};

async function gather(userId: string): Promise<AllUserData> {
  const wideStart = new Date(Date.UTC(2000, 0, 1));
  const wideEnd = new Date(Date.UTC(2200, 0, 1));
  const [income, fixed, variable, payments, savings, categories, settings] =
    await Promise.all([
      listIncomeEntries(userId),
      listFixed(userId),
      listVariable(userId, { start: wideStart, end: wideEnd, limit: 100_000 }),
      listAllPayments(userId),
      listSavings(userId),
      listCategories(userId),
      getSettings(userId),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    schema: "1.0",
    income,
    fixed,
    variable,
    payments,
    savings,
    categories,
    settings,
  };
}

export async function exportAllJsonAction(): Promise<
  ActionResult<{ filename: string; json: string }>
> {
  const user = await requireUser();
  try {
    const data = await gather(user.id);
    const filename = `pocketbook-export-${new Date().toISOString().slice(0, 10)}.json`;
    return { ok: true, data: { filename, json: JSON.stringify(data, null, 2) } };
  } catch (err) {
    return fromUnknown(err);
  }
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvCell).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvCell(r[c])).join(","))
    .join("\n");
  return rows.length === 0 ? header + "\n" : header + "\n" + body + "\n";
}

const COLUMNS: Record<ExportDomain, string[]> = {
  income: ["id", "amountPaise", "effectiveDate", "note", "createdAt", "updatedAt"],
  fixed: [
    "id",
    "name",
    "amountPaise",
    "categoryId",
    "isActive",
    "isAutoDebit",
    "startDate",
    "intervalValue",
    "intervalUnit",
    "endDate",
    "lastPaidDate",
    "note",
    "createdAt",
    "updatedAt",
  ],
  variable: [
    "id",
    "amountPaise",
    "currency",
    "categoryId",
    "date",
    "note",
    "tags",
    "createdAt",
    "updatedAt",
  ],
  payments: [
    "id",
    "fixedExpenseId",
    "paidDate",
    "amountPaise",
    "note",
    "usedThisCycle",
    "createdAt",
    "updatedAt",
  ],
  savings: [
    "id",
    "amountPaise",
    "effectiveDate",
    "kind",
    "goalId",
    "note",
    "createdAt",
    "updatedAt",
  ],
  categories: ["id", "name", "type", "icon", "color", "createdAt", "updatedAt"],
};

export async function exportDomainCsvAction(
  domain: ExportDomain,
): Promise<ActionResult<{ filename: string; csv: string; rowCount: number }>> {
  const user = await requireUser();
  try {
    const data = await gather(user.id);
    const rows = data[domain] as unknown as Record<string, unknown>[];
    const csv = rowsToCsv(rows, COLUMNS[domain]);
    const filename = `pocketbook-${domain}-${new Date().toISOString().slice(0, 10)}.csv`;
    return { ok: true, data: { filename, csv, rowCount: rows.length } };
  } catch (err) {
    return fromUnknown(err);
  }
}
