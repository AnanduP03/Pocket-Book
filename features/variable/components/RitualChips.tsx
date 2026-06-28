"use client";

import { useMemo } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { detectRituals, type Ritual } from "../lib/detect-rituals";
import { formatCurrency } from "@/lib/format/money";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainVariable } from "@/db/repositories/variable";

type Props = {
  items: PlainVariable[];
  categories: PlainCategory[];
  currency: string;
  locale: string;
  /** Tap-to-log handler — opens quick-log pre-filled with the ritual's
   *  amount + category. */
  onLog: (init: { amountPaise: number; categoryId: string }) => void;
  /** Optional pre-computed rituals so the parent can compute once and
   *  decide whether to auto-hide the wrapping collapsible. When omitted
   *  the component computes them itself. */
  rituals?: Ritual[];
};

function relativeDays(iso: string, now: Date): string {
  const days = Math.round(
    (now.getTime() - new Date(iso).getTime()) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "a week ago";
  return `${Math.round(days / 7)} weeks ago`;
}

/**
 * Surfaces the user's recurring variable patterns ("rituals") as a row
 * of pill-shaped chips. Overdue rituals are visually distinct so the
 * user can tell at a glance which rhythms have slipped this week.
 *
 * Auto-hides when nothing has fired three or more times in the last
 * 60 days (i.e., no rituals exist yet).
 */
export function RitualChips({
  items,
  categories,
  currency,
  locale,
  onLog,
  rituals: precomputed,
}: Props) {
  const rituals = useMemo(
    () => precomputed ?? detectRituals(items),
    [precomputed, items],
  );
  const categoryById = useMemo(() => {
    const m = new Map<string, PlainCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  if (rituals.length === 0) return null;

  const now = new Date();

  return (
    <section className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4">
      <header className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
        >
          <Repeat className="h-3.5 w-3.5 text-(--text)" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-(--text)">Your usuals</h2>
          <p className="text-[11px] text-(--muted)">
            Tap to re-log. Overdue rituals are highlighted.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {rituals.slice(0, 8).map((r) => {
          const cat = categoryById.get(r.categoryId);
          return (
            <Button
              key={r.key}
              type="button"
              variant={r.isOverdue ? "primary" : "outline"}
              size="sm"
              onClick={() =>
                onLog({
                  amountPaise: r.typicalAmountPaise,
                  categoryId: r.categoryId,
                })
              }
              className="h-auto rounded-full px-3 py-1.5 text-xs"
              aria-label={`Re-log ${cat?.name ?? "ritual"} of ${formatCurrency(
                r.typicalAmountPaise,
                currency,
                locale,
              )}`}
            >
              {cat ? (
                <CategoryIcon name={cat.icon} color={cat.color} size="sm" />
              ) : null}
              <span className="font-medium">{cat?.name ?? "Unknown"}</span>
              <span className="tabular-nums">
                {formatCurrency(r.typicalAmountPaise, currency, locale)}
              </span>
              <span className="text-[10px] opacity-70">
                · {relativeDays(r.lastSeenIso, now)}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
