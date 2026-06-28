import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
  incomePaise: number;
  fixedPaise: number;
  variablePaise: number;
  freeCashPaise: number;
  pendingSweepPaise: number | null;
};

type Segment = {
  key: "fixed" | "variable" | "unspent";
  label: string;
  description: string;
  amountPaise: number;
  share: number;
  className: string;
  swatchClassName: string;
};

export function IncomeAllocationCard({
  currency,
  locale,
  incomePaise,
  fixedPaise,
  variablePaise,
  freeCashPaise,
  pendingSweepPaise,
}: Props) {
  if (incomePaise <= 0) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeader>
          <div>
            <CardTitle>Income allocation</CardTitle>
            <CardDescription>This month</CardDescription>
          </div>
        </CardHeader>
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-4 text-center text-xs text-(--muted)">
          Add this month&rsquo;s income to see how it&rsquo;s allocated.
        </div>
      </Card>
    );
  }

  const unspent = Math.max(0, freeCashPaise);
  const overspentPaise = freeCashPaise < 0 ? -freeCashPaise : 0;
  const pct = (n: number): number => (incomePaise > 0 ? (n / incomePaise) * 100 : 0);

  const segments: Segment[] = [
    {
      key: "fixed",
      label: "Fixed",
      description: "Bills & commitments",
      amountPaise: fixedPaise,
      share: pct(fixedPaise),
      className: "bg-(--accent)",
      swatchClassName: "bg-(--accent)",
    },
    {
      key: "variable",
      label: "Variable",
      description: "Discretionary spend",
      amountPaise: variablePaise,
      share: pct(variablePaise),
      className: "bg-(--warning)",
      swatchClassName: "bg-(--warning)",
    },
    {
      key: "unspent",
      label: "Unspent",
      description: "Becomes savings at month-end",
      amountPaise: unspent,
      share: pct(unspent),
      className: "bg-(--success)",
      swatchClassName: "bg-(--success)",
    },
  ];

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>Income allocation</CardTitle>
          <CardDescription>
            How {formatCurrency(incomePaise, currency, locale)} is being used this month
          </CardDescription>
        </div>
      </CardHeader>

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-(--surface-2)"
        role="img"
        aria-label="Income allocation breakdown"
      >
        {segments.map((s) =>
          s.share > 0 ? (
            <div
              key={s.key}
              className={s.className}
              style={{ width: `${s.share}%` }}
              aria-hidden
            />
          ) : null,
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {segments.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${s.swatchClassName}`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-(--text)">{s.label}</p>
                <p className="truncate text-[11px] text-(--muted)">
                  {s.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="tabular-nums text-sm font-medium text-(--text)">
                {formatCurrency(s.amountPaise, currency, locale)}
              </span>
              <span className="tabular-nums text-[11px] text-(--muted)">
                {s.share.toFixed(s.share < 10 ? 1 : 0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>

      {overspentPaise > 0 ? (
        <div className="rounded-[var(--radius-input)] border border-(--danger)/30 bg-(--danger)/10 px-3 py-2 text-xs text-(--text)">
          Spending has exceeded income by{" "}
          <span className="tabular-nums font-medium">
            {formatCurrency(overspentPaise, currency, locale)}
          </span>{" "}
          this month.
        </div>
      ) : null}

      {pendingSweepPaise && pendingSweepPaise > 0 ? (
        <p className="text-xs text-(--muted)">
          <span className="tabular-nums font-medium text-(--text)">
            {formatCurrency(pendingSweepPaise, currency, locale)}
          </span>{" "}
          from last month is queued for savings.
        </p>
      ) : null}
    </Card>
  );
}
