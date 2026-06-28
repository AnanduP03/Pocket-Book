"use client";

import {
  CheckCircle2,
  History,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  SkipForward,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwipeRow } from "@/components/ui/swipe-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/lib/format/money";
import {
  daysBetween,
  nextRenewalDate,
  ruleOf,
} from "../lib/billing";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainCategory } from "@/db/repositories/categories";

export type FullSection = "overdue" | "skipped";

type Props = {
  fixed: PlainFixedExpense;
  category: PlainCategory | undefined;
  section: FullSection;
  currency: string;
  locale: string;
  onEdit: (f: PlainFixedExpense) => void;
  onHistory: (f: PlainFixedExpense) => void;
  onMarkPaid: (f: PlainFixedExpense) => void;
  onSkip: (f: PlainFixedExpense) => void;
  onUnskip: (f: PlainFixedExpense) => void;
  onUnmarkPaid: (f: PlainFixedExpense) => void;
  onToggleActive: (f: PlainFixedExpense) => void;
  onDelete: (f: PlainFixedExpense) => void;
  busy?: boolean;
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

function statusHint(f: PlainFixedExpense, section: FullSection): string {
  if (section === "overdue") {
    const next = nextRenewalDate(ruleOf(f), new Date());
    const days = next ? daysBetween(next, new Date()) : 0;
    return days > 0 ? `Overdue by ${days}d` : "Overdue";
  }
  return "Skipped this cycle";
}

export function FixedCardFull({
  fixed: f,
  category,
  section,
  currency,
  locale,
  onEdit,
  onHistory,
  onMarkPaid,
  onSkip,
  onUnskip,
  onUnmarkPaid,
  onToggleActive,
  onDelete,
  busy,
}: Props) {
  const hint = statusHint(f, section);
  const isOverdue = section === "overdue";

  return (
    <li>
      <SwipeRow
        className="rounded-[var(--radius-card)]"
        disabled={busy || !f.isActive}
        rightAction={
          isOverdue
            ? {
                visual: {
                  label: "Mark paid",
                  icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
                  bgClass: "bg-(--success)/40",
                },
                run: () => onMarkPaid(f),
              }
            : {
                visual: {
                  label: "Undo skip",
                  icon: <Undo2 className="h-4 w-4" aria-hidden />,
                  bgClass: "bg-(--accent)/40",
                },
                run: () => onUnskip(f),
              }
        }
        leftAction={
          isOverdue
            ? {
                visual: {
                  label: "Skip",
                  icon: <SkipForward className="h-4 w-4" aria-hidden />,
                  bgClass: "bg-(--warning)/40",
                },
                run: () => onSkip(f),
              }
            : null
        }
      >
        <div
          className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-(--border) border-l-[3px] bg-(--surface) p-4"
          style={category ? { borderLeftColor: category.color } : undefined}
        >
          <div className="flex items-start gap-3">
            {category ? (
              <CategoryIcon name={category.icon} color={category.color} size="md" />
            ) : (
              <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2)"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text)">
                {f.name}
              </p>
              <p className="truncate text-xs text-(--muted)">
                {category?.name ?? "Unknown category"} ·{" "}
                {intervalLabel(f.intervalValue, f.intervalUnit)}
              </p>
            </div>
            <p className="shrink-0 tabular-nums text-sm font-semibold text-(--text)">
              {formatCurrency(f.amountPaise, currency, locale)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge tone={isOverdue ? "warning" : "muted"}>{hint}</Badge>
            {f.isAutoDebit ? (
              <Zap aria-label="Auto-debit" className="h-3 w-3 text-(--muted)" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
            {isOverdue ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => onMarkPaid(f)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Mark paid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onSkip(f)}
                >
                  <SkipForward className="h-3.5 w-3.5" aria-hidden />
                  Skip
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onUnskip(f)}
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                Undo skip
              </Button>
            )}

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
                <DropdownMenuItem onSelect={() => onHistory(f)}>
                  <History className="h-4 w-4 text-(--muted)" aria-hidden />
                  Payment history
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(f)}>
                  <Pencil className="h-4 w-4 text-(--muted)" aria-hidden />
                  Edit
                </DropdownMenuItem>
                {f.lastPaidDate ? (
                  <DropdownMenuItem onSelect={() => onUnmarkPaid(f)}>
                    <Undo2 className="h-4 w-4 text-(--muted)" aria-hidden />
                    Unmark last payment
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => onToggleActive(f)}>
                  {f.isActive ? (
                    <Pause className="h-4 w-4 text-(--muted)" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4 text-(--muted)" aria-hidden />
                  )}
                  {f.isActive ? "Pause" : "Resume"}
                </DropdownMenuItem>
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
          </div>
        </div>
      </SwipeRow>
    </li>
  );
}
