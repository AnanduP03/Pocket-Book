import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlossaryTip } from "@/components/ui/glossary-tip";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
  daysElapsed: number;
  daysInMonth: number;
  variablePaise: number;
};

export function BurnRateCard({
  currency,
  locale,
  daysElapsed,
  daysInMonth,
  variablePaise,
}: Props) {
  const dailyAvg = Math.round(variablePaise / daysElapsed);
  const progressPct = Math.min(100, (daysElapsed / daysInMonth) * 100);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>
            Burn rate
            <GlossaryTip
              term="Burn rate"
              description="How fast you're spending variable money per day, on average. Calculated as this month's variable spending divided by days elapsed. A steady burn matches your typical month; a high burn means you're tracking ahead of usual."
            />
          </CardTitle>
          <CardDescription>
            Day {daysElapsed} of {daysInMonth} · {daysRemaining} left
          </CardDescription>
        </div>
      </CardHeader>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)">
        <div
          className="h-full bg-(--accent) transition-[width] duration-700"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Daily average
          </p>
          <p className="mt-1 tabular-nums text-2xl font-semibold text-(--text)">
            {formatCurrency(dailyAvg, currency, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Spent so far
          </p>
          <p className="mt-1 tabular-nums text-2xl font-semibold text-(--text)">
            {formatCurrency(variablePaise, currency, locale)}
          </p>
        </div>
      </div>
    </Card>
  );
}
