"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/lib/format/money";
import { formatDateRelative } from "@/lib/format/date";
import type { PlainVariable } from "@/db/repositories/variable";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  items: PlainVariable[];
  categories: PlainCategory[];
  onEdit: (e: PlainVariable) => void;
  onDelete: (e: PlainVariable) => void;
  busyId?: string | null;
  emptyMessage?: string;
};

export function VariableList({
  items,
  categories,
  onEdit,
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
          {emptyMessage ??
            "No expenses yet — log your first to see it here."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => {
        const c = categoryById.get(e.categoryId);
        const busy = busyId === e.id;
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          >
            {c ? (
              <CategoryIcon name={c.icon} color={c.color} size="md" />
            ) : (
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2) text-xs text-(--muted)"
                aria-hidden
              >
                ?
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-(--text)">
                  {c?.name ?? "Unknown"}
                </p>
                <p className="shrink-0 tabular-nums text-sm font-semibold text-(--text)">
                  {formatCurrency(e.amountPaise, e.currency)}
                </p>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-(--muted)">
                <p className="truncate">
                  {e.note ?? <span className="italic">No note</span>}
                </p>
                <p className="shrink-0">{formatDateRelative(new Date(e.date))}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit expense ${formatCurrency(e.amountPaise, e.currency)}`}
                disabled={busy}
                onClick={() => onEdit(e)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete expense"
                disabled={busy}
                onClick={() => onDelete(e)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
