"use client";

import { useMemo } from "react";
import { CollapsibleSection } from "@/features/variable/components/CollapsibleSection";
import { FixedCardCompact, type CompactSection } from "./FixedCardCompact";
import { FixedCardFull, type FullSection } from "./FixedCardFull";
import type { StatusGroups } from "../lib/group-by-status";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  groups: StatusGroups;
  categories: PlainCategory[];
  currency: string;
  locale: string;
  onEdit: (f: PlainFixedExpense) => void;
  onHistory: (f: PlainFixedExpense) => void;
  onMarkPaid: (f: PlainFixedExpense) => void;
  onUnmarkPaid: (f: PlainFixedExpense) => void;
  onSkip: (f: PlainFixedExpense) => void;
  onUnskip: (f: PlainFixedExpense) => void;
  onToggleActive: (f: PlainFixedExpense) => void;
  onDelete: (f: PlainFixedExpense) => void;
  busyId?: string | null;
  emptyMessage?: string;
};

export function FixedList({
  groups,
  categories,
  currency,
  locale,
  onEdit,
  onHistory,
  onMarkPaid,
  onUnmarkPaid,
  onSkip,
  onUnskip,
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

  const total =
    groups.overdue.length +
    groups.skipped.length +
    groups.upcoming.length +
    groups.paid.length +
    groups.paused.length +
    groups.ended.length;

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">
          {emptyMessage ?? "No fixed expenses yet."}
        </p>
      </div>
    );
  }

  function renderFullSection(
    title: string,
    items: PlainFixedExpense[],
    section: FullSection,
  ) {
    if (items.length === 0) return null;
    return (
      <section aria-labelledby={`status-${section}`}>
        <h2
          id={`status-${section}`}
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted)"
        >
          {title} ({items.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((f) => (
            <FixedCardFull
              key={f.id}
              fixed={f}
              category={categoryById.get(f.categoryId)}
              section={section}
              currency={currency}
              locale={locale}
              onEdit={onEdit}
              onHistory={onHistory}
              onMarkPaid={onMarkPaid}
              onSkip={onSkip}
              onUnskip={onUnskip}
              onUnmarkPaid={onUnmarkPaid}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              busy={busyId === f.id}
            />
          ))}
        </ul>
      </section>
    );
  }

  function renderCompactSection(
    title: string,
    items: PlainFixedExpense[],
    section: CompactSection,
    expanded: boolean,
  ) {
    if (items.length === 0) return null;
    const list = (
      <ul className="flex flex-col gap-2">
        {items.map((f) => (
          <FixedCardCompact
            key={f.id}
            fixed={f}
            category={categoryById.get(f.categoryId)}
            section={section}
            currency={currency}
            locale={locale}
            onEdit={onEdit}
            onHistory={onHistory}
            onUnmarkPaid={onUnmarkPaid}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            busy={busyId === f.id}
          />
        ))}
      </ul>
    );
    if (expanded) {
      return (
        <section aria-labelledby={`status-${section}`}>
          <h2
            id={`status-${section}`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted)"
          >
            {title} ({items.length})
          </h2>
          {list}
        </section>
      );
    }
    return (
      <CollapsibleSection title={`${title} (${items.length})`}>
        {list}
      </CollapsibleSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {renderFullSection("Overdue", groups.overdue, "overdue")}
      {renderFullSection("Skipped", groups.skipped, "skipped")}
      {renderCompactSection("Upcoming", groups.upcoming, "upcoming", true)}
      {renderCompactSection("Paid", groups.paid, "paid", false)}
      {renderCompactSection("Paused", groups.paused, "paused", false)}
      {renderCompactSection("Ended", groups.ended, "ended", false)}
    </div>
  );
}
