"use client";

import { useMemo } from "react";
import { AlertCircle, TrendingUp } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardCharts } from "../hooks/useDashboardCharts";
import { formatCurrency } from "@/lib/format/money";
import type { CategoryWithTrend } from "../queries";

type Props = {
  currency: string;
  locale: string;
};

type CapStatus = "approaching" | "over";

type CapHit = {
  cat: CategoryWithTrend;
  status: CapStatus;
  /** Share of the trailing average already spent (e.g., 0.85 = 85%). */
  share: number;
};

const APPROACH_THRESHOLD = 0.8;

/**
 * Picks the variable categories that have hit ≥ 80% of their trailing
 * 3-month average this month — the "soft caps". The cap is purely
 * informational: nothing is enforced, just surfaced. We rank by share
 * descending so the most-strained category is on top.
 */
function pickHits(
  cats: CategoryWithTrend[] | undefined,
): CapHit[] {
  if (!cats) return [];
  const hits: CapHit[] = [];
  for (const c of cats) {
    if (c.type !== "Variable") continue;
    if (c.avgPaise <= 0) continue;
    const share = c.paise / c.avgPaise;
    if (share < APPROACH_THRESHOLD) continue;
    hits.push({ cat: c, share, status: share >= 1 ? "over" : "approaching" });
  }
  return hits.sort((a, b) => b.share - a.share).slice(0, 5);
}

/**
 * Quiet dashboard card surfacing variable categories that are at or past
 * their typical monthly spend. The "cap" learns from the trailing 3-month
 * average — there's nothing to configure. Auto-hides when no category is
 * approaching its cap.
 */
export function SoftCapsCard({ currency, locale }: Props) {
  const { data, isLoading } = useDashboardCharts();

  const hits = useMemo(() => {
    const breakdown = data?.monthlyBreakdowns?.[0];
    return pickHits(breakdown?.variable);
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-[140px] w-full" />;
  }

  if (hits.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <TrendingUp className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Categories near your usual</CardTitle>
            <CardDescription>
              Soft caps based on your last 3 months. Nothing's enforced.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {hits.map(({ cat, share, status }) => {
          const pct = Math.round(share * 100);
          const over = status === "over";
          return (
            <li
              key={cat.categoryId}
              className="flex flex-col gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <p className="truncate text-sm font-medium text-(--text)">
                    {cat.name}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    over
                      ? "bg-(--danger)/15 text-(--danger)"
                      : "bg-(--warning)/15 text-(--warning)"
                  }`}
                >
                  {over ? <AlertCircle className="h-3 w-3" aria-hidden /> : null}
                  {over ? "Over usual" : `${pct}%`}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-(--surface-2)"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(pct, 100)}
              >
                <div
                  className={`h-full rounded-full transition-[width] ${
                    over ? "bg-(--danger)" : "bg-(--warning)"
                  }`}
                  style={{ width: `${Math.min(100, Math.round(share * 100))}%` }}
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-(--muted)">
                <span>
                  {formatCurrency(cat.paise, currency, locale)} this month
                </span>
                <span>
                  Usual {formatCurrency(cat.avgPaise, currency, locale)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
