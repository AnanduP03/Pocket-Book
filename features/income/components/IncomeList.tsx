"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { PlainIncomeEntry } from "@/db/repositories/income";

type Props = {
  entries: PlainIncomeEntry[];
  currency: string;
  locale: string;
  onEdit: (e: PlainIncomeEntry) => void;
  onDelete: (e: PlainIncomeEntry) => void;
  busyId?: string | null;
};

export function IncomeList({
  entries,
  currency,
  locale,
  onEdit,
  onDelete,
  busyId,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">
          We need a rough income figure to show free cash. Drop one in once
          — we'll handle the math from there.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e, idx) => {
        const isLatest = idx === 0;
        const busy = busyId === e.id;
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="tabular-nums text-base font-semibold text-(--text)">
                  {formatCurrency(e.amountPaise, currency, locale)}
                </p>
                {isLatest ? (
                  <span className="rounded-full bg-(--success)/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--text)">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-(--muted)">
                Effective {formatDate(new Date(e.effectiveDate), locale)}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${formatCurrency(e.amountPaise, currency, locale)}`}
                disabled={busy}
                onClick={() => onEdit(e)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete income entry"
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
