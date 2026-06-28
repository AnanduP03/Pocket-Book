"use client";

import { useMemo } from "react";
import { Tag } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";
import { buildTagInsights, type TagInsight } from "../lib/build-tag-insights";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainVariable } from "@/db/repositories/variable";

type Props = {
  /** All variable expenses to reflect on. We slice to the current month
   *  inside the helper to keep the page-side wiring simple. */
  items: PlainVariable[];
  categories: PlainCategory[];
  currency: string;
  locale: string;
  /** Optional pre-computed insights so the parent can compute once and
   *  decide whether to auto-hide the wrapping collapsible. When omitted
   *  the component computes them itself. */
  insights?: TagInsight[];
};

/**
 * Quiet reflection card surfacing patterns in this month's tagged expenses.
 * Auto-hides when there's nothing to say (no tagged expenses, or no tag
 * has been used at least twice this month).
 */
export function TagReflection({
  items,
  categories,
  currency,
  locale,
  insights: precomputed,
}: Props) {
  const insights = useMemo(
    () => precomputed ?? buildTagInsights(items, categories),
    [precomputed, items, categories],
  );

  if (insights.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <Tag className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Patterns this month</CardTitle>
            <CardDescription>
              What your tags have been quietly saying.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {insights.map((i) => (
          <li
            key={i.tag}
            className="flex items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3"
          >
            <span className="rounded-full bg-(--accent)/20 px-2 py-0.5 text-[11px] font-medium text-(--text)">
              {i.tag}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-(--text)">
                {i.dominantCategory ? (
                  <>
                    <span className="font-medium">
                      {i.dominantCategory.share}%
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">"{i.tag}"</span> tagged
                    expenses were{" "}
                    <span className="font-medium">
                      {i.dominantCategory.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">"{i.tag}"</span> spread across
                    categories — no clear pattern
                  </>
                )}
              </p>
              <p className="text-[11px] text-(--muted)">
                {i.count} {i.count === 1 ? "expense" : "expenses"} ·{" "}
                {formatCurrency(i.totalPaise, currency, locale)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
