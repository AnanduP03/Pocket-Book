import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/lib/format/money";
import { formatDateRelative } from "@/lib/format/date";
import type { PlainVariable } from "@/db/repositories/variable";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  items: PlainVariable[];
  categories: PlainCategory[];
  currency: string;
  locale: string;
};

export function RecentVariableStrip({
  items,
  categories,
  currency,
  locale,
}: Props) {
  const byId = new Map(categories.map((c) => [c.id, c] as const));

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle>Recent variable</CardTitle>
        <Link
          href="/variable"
          className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Open <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </CardHeader>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-4 text-center text-xs text-(--muted)">
          Nothing yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((e) => {
            const c = byId.get(e.categoryId);
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-[var(--radius-input)] px-2 py-1.5"
              >
                {c ? (
                  <CategoryIcon name={c.icon} color={c.color} size="sm" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-(--text)">
                    {e.note ?? c?.name ?? "Expense"}
                  </p>
                  <p className="text-xs text-(--muted)">
                    {formatDateRelative(new Date(e.date), locale)}
                    {c && e.note ? ` · ${c.name}` : ""}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-sm font-medium text-(--text)">
                  {formatCurrency(e.amountPaise, e.currency, locale)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
