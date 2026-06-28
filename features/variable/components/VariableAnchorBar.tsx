"use client";

import { formatCurrency } from "@/lib/format/money";

type Props = {
  monthTotalPaise: number;
  todayTotalPaise: number;
  todayCount: number;
  currency: string;
  locale: string;
};

/**
 * Single-row summary card anchoring /variable. "This month" is the
 * page's stable reference point — it does NOT reflect the active filter.
 * "Today" sits to the right as a baseline-aligned supporting stat,
 * subordinate to the month total in size and weight.
 *
 * Renders as a definition list so screen readers pair labels with
 * values. aria-live="polite" announces updates after a log lands.
 */
export function VariableAnchorBar({
  monthTotalPaise,
  todayTotalPaise,
  todayCount,
  currency,
  locale,
}: Props) {
  const todayValue =
    todayCount === 0
      ? "No logs"
      : formatCurrency(todayTotalPaise, currency, locale);
  const todayMeta =
    todayCount === 0
      ? null
      : `${todayCount} ${todayCount === 1 ? "log" : "logs"}`;

  return (
    <section
      aria-label="Spending summary"
      aria-live="polite"
      className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface) px-5 py-4"
    >
      <dl className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            This month
          </dt>
          <dd className="font-display text-3xl tabular-nums tracking-tight text-(--text) sm:text-4xl">
            {formatCurrency(monthTotalPaise, currency, locale)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <dt className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Today
          </dt>
          <dd className="flex items-baseline gap-2 tabular-nums text-base font-medium text-(--text)">
            <span>{todayValue}</span>
            {todayMeta ? (
              <span className="text-xs font-normal text-(--muted)">
                {todayMeta}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}
