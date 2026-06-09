"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  History,
  Pencil,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { StatusChip } from "./StatusChip";
import { formatCurrency } from "@/lib/format/money";
import { deriveStatus, type Rule } from "../lib/billing";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  items: PlainFixedExpense[];
  categories: PlainCategory[];
  currency: string;
  locale: string;
  onEdit: (f: PlainFixedExpense) => void;
  onHistory: (f: PlainFixedExpense) => void;
  onMarkPaid: (f: PlainFixedExpense) => void;
  onUnmarkPaid: (f: PlainFixedExpense) => void;
  onToggleActive: (f: PlainFixedExpense) => void;
  onDelete: (f: PlainFixedExpense) => void;
  busyId?: string | null;
  emptyMessage?: string;
};

const SHORT_LABELS: Record<string, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

function intervalLabel(value: number, unit: string): string {
  if (value === 1) return SHORT_LABELS[unit] ?? `Every ${unit}`;
  return `Every ${value} ${unit}s`;
}

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
}

export function FixedList({
  items,
  categories,
  currency,
  locale,
  onEdit,
  onHistory,
  onMarkPaid,
  onUnmarkPaid,
  onToggleActive,
  onDelete,
  busyId,
  emptyMessage,
}: Props) {
  const categoryById = useMemo(() => {
    const m = new Map<string, PlainCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">
          {emptyMessage ?? "No fixed expenses yet."}
        </p>
      </div>
    );
  }

  const now = new Date();

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((f) => {
        const c = categoryById.get(f.categoryId);
        const busy = busyId === f.id;
        const rule = ruleOf(f);
        const lastPaid = f.lastPaidDate ? new Date(f.lastPaidDate) : null;
        const status = deriveStatus(rule, lastPaid, now, f.isActive);
        const showMarkPaid = f.isActive && status === "overdue";
        const showUnmark = f.isActive && status === "paid" && lastPaid;

        return (
          <li
            key={f.id}
            className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          >
            <div className="flex items-start gap-3">
              {c ? (
                <CategoryIcon name={c.icon} color={c.color} size="md" />
              ) : (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2)"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-(--text)">
                    {f.name}
                  </p>
                  {f.isAutoDebit ? (
                    <Zap
                      aria-label="Auto-debit"
                      className="h-3 w-3 text-(--muted)"
                    />
                  ) : null}
                </div>
                <p className="truncate text-xs text-(--muted)">
                  {c?.name ?? "Unknown category"}
                </p>
              </div>
              <p className="shrink-0 tabular-nums text-sm font-semibold text-(--text)">
                {formatCurrency(f.amountPaise, currency, locale)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge tone="muted">
                {intervalLabel(f.intervalValue, f.intervalUnit)}
              </Badge>
              <StatusChip
                rule={rule}
                lastPaidDate={lastPaid}
                isActive={f.isActive}
                locale={locale}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-(--muted)">
                <Switch
                  checked={f.isActive}
                  onCheckedChange={() => onToggleActive(f)}
                  disabled={busy}
                  ariaLabel={`Toggle active for ${f.name}`}
                />
                {f.isActive ? "Active" : "Paused"}
              </label>

              <div className="flex shrink-0 gap-1">
                {showMarkPaid ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onMarkPaid(f)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Mark paid
                  </Button>
                ) : null}
                {showUnmark ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Undo paid"
                    disabled={busy}
                    onClick={() => onUnmarkPaid(f)}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`History for ${f.name}`}
                  disabled={busy}
                  onClick={() => onHistory(f)}
                >
                  <History className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${f.name}`}
                  disabled={busy}
                  onClick={() => onEdit(f)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${f.name}`}
                  disabled={busy}
                  onClick={() => onDelete(f)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
