import Link from "next/link";
import { ArrowRight, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { StatusChip } from "@/features/fixed/components/StatusChip";
import { formatCurrency } from "@/lib/format/money";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainCategory } from "@/db/repositories/categories";
import type { FixedStatusCounts } from "../queries";

type Props = {
  highlights: PlainFixedExpense[];
  counts: FixedStatusCounts;
  categories: PlainCategory[];
  currency: string;
  locale: string;
};

export function FixedStatusGrid({
  highlights,
  counts,
  categories,
  currency,
  locale,
}: Props) {
  const byId = new Map(categories.map((c) => [c.id, c] as const));

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div>
          <CardTitle>Commitments</CardTitle>
          <CardDescription>
            {counts.overdue} overdue · {counts.paid} paid · {counts.upcoming} upcoming
          </CardDescription>
        </div>
        <Link
          href="/fixed"
          className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Open <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </CardHeader>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--warning)/15 p-2">
          <AlertCircle className="h-4 w-4 text-(--text)" aria-hidden />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-(--muted)">
              Overdue
            </p>
            <p className="text-base font-semibold tabular-nums text-(--text)">
              {counts.overdue}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--success)/15 p-2">
          <CheckCircle2 className="h-4 w-4 text-(--text)" aria-hidden />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-(--muted)">
              Paid
            </p>
            <p className="text-base font-semibold tabular-nums text-(--text)">
              {counts.paid}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 p-2">
          <Clock className="h-4 w-4 text-(--muted)" aria-hidden />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-(--muted)">
              Upcoming
            </p>
            <p className="text-base font-semibold tabular-nums text-(--text)">
              {counts.upcoming}
            </p>
          </div>
        </div>
      </div>

      {highlights.length === 0 ? (
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-4 text-center text-xs text-(--muted)">
          Nothing yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {highlights.map((f) => {
            const c = byId.get(f.categoryId);
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-[var(--radius-input)] px-2 py-1.5"
              >
                {c ? (
                  <CategoryIcon name={c.icon} color={c.color} size="sm" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-(--text)">{f.name}</p>
                  <div className="mt-0.5">
                    <StatusChip
                      rule={{
                        startDate: new Date(f.startDate),
                        intervalValue: f.intervalValue,
                        intervalUnit: f.intervalUnit,
                        endDate: f.endDate ? new Date(f.endDate) : null,
                      }}
                      lastPaidDate={f.lastPaidDate ? new Date(f.lastPaidDate) : null}
                      isActive={f.isActive}
                      locale={locale}
                    />
                  </div>
                </div>
                <p className="shrink-0 tabular-nums text-sm text-(--text)">
                  {formatCurrency(f.amountPaise, currency, locale)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
