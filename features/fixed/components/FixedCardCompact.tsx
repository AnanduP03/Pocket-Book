"use client";

import {
  History,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { nextRenewalDate, ruleOf } from "../lib/billing";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainCategory } from "@/db/repositories/categories";

export type CompactSection = "upcoming" | "paid" | "paused" | "ended";

type Props = {
  fixed: PlainFixedExpense;
  category: PlainCategory | undefined;
  section: CompactSection;
  currency: string;
  locale: string;
  onEdit: (f: PlainFixedExpense) => void;
  onHistory: (f: PlainFixedExpense) => void;
  onUnmarkPaid: (f: PlainFixedExpense) => void;
  onToggleActive: (f: PlainFixedExpense) => void;
  onDelete: (f: PlainFixedExpense) => void;
  busy?: boolean;
};

function statusHint(
  fixed: PlainFixedExpense,
  section: CompactSection,
  locale: string,
): string {
  switch (section) {
    case "upcoming": {
      const next = nextRenewalDate(ruleOf(fixed), new Date());
      return next ? `due ${formatDate(next, locale)}` : "upcoming";
    }
    case "paid": {
      const lp = fixed.lastPaidDate ? new Date(fixed.lastPaidDate) : null;
      return lp ? `paid ${formatDate(lp, locale)}` : "paid";
    }
    case "paused":
      return "paused";
    case "ended": {
      const end = fixed.endDate ? new Date(fixed.endDate) : null;
      return end ? `ended ${formatDate(end, locale)}` : "ended";
    }
  }
}

export function FixedCardCompact({
  fixed: f,
  category,
  section,
  currency,
  locale,
  onEdit,
  onHistory,
  onUnmarkPaid,
  onToggleActive,
  onDelete,
  busy,
}: Props) {
  const hint = statusHint(f, section, locale);

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) px-4 py-3">
      {category ? (
        <CategoryIcon name={category.icon} color={category.color} size="md" />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2)"
        />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p className="truncate text-sm font-medium text-(--text)">{f.name}</p>
        {f.isAutoDebit ? (
          <Zap aria-label="Auto-debit" className="h-3 w-3 shrink-0 text-(--muted)" />
        ) : null}
      </div>

      <p className="shrink-0 tabular-nums text-sm font-semibold text-(--text)">
        {formatCurrency(f.amountPaise, currency, locale)}
      </p>

      <p className="hidden shrink-0 text-xs text-(--muted) sm:inline">
        {hint}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`More actions for ${f.name}`}
            disabled={busy}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          {section === "paid" ? (
            <>
              <DropdownMenuItem onSelect={() => onUnmarkPaid(f)}>
                <Undo2 className="h-4 w-4 text-(--muted)" aria-hidden />
                Unmark last payment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={() => onHistory(f)}>
            <History className="h-4 w-4 text-(--muted)" aria-hidden />
            Payment history
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(f)}>
            <Pencil className="h-4 w-4 text-(--muted)" aria-hidden />
            Edit
          </DropdownMenuItem>
          {section !== "ended" ? (
            <DropdownMenuItem onSelect={() => onToggleActive(f)}>
              {f.isActive ? (
                <Pause className="h-4 w-4 text-(--muted)" aria-hidden />
              ) : (
                <Play className="h-4 w-4 text-(--muted)" aria-hidden />
              )}
              {f.isActive ? "Pause" : "Resume"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onDelete(f)}
            className="text-(--danger) data-[highlighted]:bg-(--danger)/15 data-[highlighted]:text-(--danger)"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
