import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
  daysElapsed: number;
  daysInMonth: number;
  variablePaise: number;
  projectedFreeCashPaise: number;
};

export function BurnRateCard({
  currency,
  locale,
  daysElapsed,
  daysInMonth,
  variablePaise,
  projectedFreeCashPaise,
}: Props) {
  const dailyAvg = Math.round(variablePaise / daysElapsed);
  const progressPct = Math.min(100, (daysElapsed / daysInMonth) * 100);
  const positive = projectedFreeCashPaise >= 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Burn rate</CardTitle>
          <CardDescription>
            Day {daysElapsed} of {daysInMonth}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)">
        <div
          className="h-full bg-(--accent)"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-(--muted)">
            Daily
          </p>
          <p className="mt-1 tabular-nums text-xl font-semibold text-(--text)">
            {formatCurrency(dailyAvg, currency, locale)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-(--muted)">
            Projected
          </p>
          <p
            className={
              positive
                ? "mt-1 tabular-nums text-xl font-semibold text-(--text)"
                : "mt-1 tabular-nums text-xl font-semibold text-(--danger)"
            }
          >
            {formatCurrency(projectedFreeCashPaise, currency, locale)}
          </p>
        </div>
      </div>
    </Card>
  );
}
