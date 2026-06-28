"use client";

import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  duePaise: number;
  paidPaise: number;
  remainingPaise: number;
  overdueCount: number;
  currency: string;
  locale: string;
};

/**
 * Anchor card for /fixed. Mirrors /variable's hero rhythm: one big
 * number on the left (Remaining), supporting paid/total + overdue
 * count right-aligned and subordinate.
 */
export function FixedAnchorBar({
  duePaise,
  paidPaise,
  remainingPaise,
  overdueCount,
  currency,
  locale,
}: Props) {
  const allPaid = duePaise > 0 && remainingPaise === 0;

  return (
    <section
      aria-label="This month summary"
      aria-live="polite"
      className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface) px-5 py-4"
    >
      <dl className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Remaining this month
          </dt>
          <dd className="font-display text-3xl tabular-nums tracking-tight text-(--text) sm:text-4xl">
            {formatCurrency(remainingPaise, currency, locale)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <dt className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            <span>Paid</span>
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-(--danger)/15 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-(--danger)">
                <AlertCircle className="h-3 w-3" aria-hidden />
                {overdueCount} overdue
              </span>
            ) : allPaid ? (
              <span className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                All paid
              </span>
            ) : null}
          </dt>
          <dd className="flex items-baseline gap-2 tabular-nums text-base font-medium text-(--text)">
            <span>{formatCurrency(paidPaise, currency, locale)}</span>
            <span className="text-xs font-normal text-(--muted)">
              of {formatCurrency(duePaise, currency, locale)}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
