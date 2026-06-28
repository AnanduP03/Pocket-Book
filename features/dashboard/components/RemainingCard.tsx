import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { GlossaryTip } from "@/components/ui/glossary-tip";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
  freeCashPaise: number;
  variablePaise: number;
  avgVariablePaise: number;
  trailingMonthsForAvg: number;
  trendValues: number[];
};

export function RemainingCard({
  currency,
  locale,
  freeCashPaise,
  variablePaise,
  avgVariablePaise,
  trailingMonthsForAvg,
  trendValues,
}: Props) {
  const hasHistory = trailingMonthsForAvg > 0 && avgVariablePaise > 0;
  const expectedRemainingVariable = hasHistory
    ? Math.max(0, avgVariablePaise - variablePaise)
    : 0;
  const remainingBudget = freeCashPaise - expectedRemainingVariable;
  const negative = remainingBudget < 0;

  const subtitle = hasHistory
    ? negative
      ? "Short at typical pace"
      : "Left at typical pace"
    : "Add history for forecast";

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>
            Remaining
            <GlossaryTip
              term="Remaining"
              description="What's left after we project the rest of the month's variable spend at your typical pace. If your trailing average is high, this can dip into the red even when your free-cash number is healthy."
            />
          </CardTitle>
          <CardDescription>After typical variable spend</CardDescription>
        </div>
      </CardHeader>

      <p
        className={
          negative
            ? "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--danger) break-words sm:text-4xl lg:text-5xl"
            : "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--text) break-words sm:text-4xl lg:text-5xl"
        }
      >
        {formatCurrency(Math.abs(remainingBudget), currency, locale)}
      </p>

      <p className="text-xs text-(--muted)">{subtitle}</p>

      <div className="mt-auto pt-2">
        <Sparkline
          values={trendValues}
          width={240}
          height={32}
          className="w-full"
          ariaLabel="Variable spend over the last 6 months"
        />
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-(--muted)">
          Variable · 6 months
        </p>
      </div>
    </Card>
  );
}
