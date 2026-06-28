"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  HandCoins,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { PlainSavingsEntry } from "@/db/repositories/savings";
import type { SavingsEntryKind } from "@/db/models/SavingsEntry";

type Props = {
  entries: PlainSavingsEntry[];
  currency: string;
  locale: string;
  onDelete: (e: PlainSavingsEntry) => void;
  busyId?: string | null;
};

const KIND_LABEL: Record<SavingsEntryKind, string> = {
  manual_deposit: "Deposit",
  manual_withdrawal: "Withdrawal",
  month_surplus: "Month-end sweep",
  month_cover: "Shortfall cover",
};

const KIND_ICON = {
  manual_deposit: ArrowUp,
  manual_withdrawal: ArrowDown,
  month_surplus: CalendarCheck,
  month_cover: HandCoins,
};

export function SavingsList({
  entries,
  currency,
  locale,
  onDelete,
  busyId,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">
          Savings is quiet. Once you sweep a surplus or log a deposit, this
          list fills up on its own.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => {
        const credit = e.amountPaise > 0;
        const Icon = KIND_ICON[e.kind];
        const busy = busyId === e.id;
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          >
            <span
              aria-hidden
              className={
                credit
                  ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-(--success)/30 text-(--text)"
                  : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-(--warning)/30 text-(--text)"
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-(--text)">
                  {KIND_LABEL[e.kind]}
                </p>
                {e.kind === "month_surplus" || e.kind === "month_cover" ? (
                  <Badge tone="muted">Auto</Badge>
                ) : null}
              </div>
              <p className="text-xs text-(--muted)">
                {formatDate(new Date(e.effectiveDate), locale)}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <p
              className={
                credit
                  ? "shrink-0 tabular-nums text-sm font-semibold text-(--success)"
                  : "shrink-0 tabular-nums text-sm font-semibold text-(--warning)"
              }
            >
              {credit ? "+" : "−"}
              {formatCurrency(Math.abs(e.amountPaise), currency, locale)}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete entry"
              disabled={busy}
              onClick={() => onDelete(e)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
