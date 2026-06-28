import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { LongPressBreakdown } from "@/components/ui/long-press-breakdown";
import { GlossaryTip } from "@/components/ui/glossary-tip";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";

type Props = {
  currency: string;
  locale: string;
  freeCashPaise: number;
  remainingFixedPaise: number;
  trendValues: number[];
  /** ISO date when free cash is projected to hit zero at current burn,
   *  or null if free cash is on track / already gone / burn is zero. */
  projectedRunsOutAtIso?: string | null;
  /** Optional inputs that produced freeCashPaise — when supplied, a
   *  long-press on the hero amount reveals the breakdown. */
  monthlyIncomePaise?: number;
  monthlyFixedPaise?: number;
  monthlyVariablePaise?: number;
};

export function FreeCashCard({
  currency,
  locale,
  freeCashPaise,
  remainingFixedPaise,
  trendValues,
  projectedRunsOutAtIso,
  monthlyIncomePaise,
  monthlyFixedPaise,
  monthlyVariablePaise,
}: Props) {
  const positive = freeCashPaise >= 0;
  const showBreakdown =
    monthlyIncomePaise !== undefined &&
    monthlyFixedPaise !== undefined &&
    monthlyVariablePaise !== undefined;
  const amountClass = positive
    ? "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--text) break-words sm:text-4xl lg:text-5xl"
    : "pb-amount font-display text-3xl tabular-nums tracking-tight text-(--danger) break-words sm:text-4xl lg:text-5xl";

  const amount = (
    <p className={amountClass}>
      {formatCurrency(freeCashPaise, currency, locale)}
    </p>
  );

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader>
        <div>
          <CardTitle>
            Free cash
            <GlossaryTip
              term="Free cash"
              description="Money left over after subtracting your fixed bills and variable spending from this month's income. Positive means you're under-budget; negative means you're spending more than you earn this month."
            />
          </CardTitle>
          <CardDescription>This month · long-press for details</CardDescription>
        </div>
      </CardHeader>

      {showBreakdown ? (
        <LongPressBreakdown
          title="Free cash · how it's computed"
          lines={[
            {
              label: "Income",
              value: formatCurrency(monthlyIncomePaise!, currency, locale),
            },
            {
              label: "− Fixed",
              value: formatCurrency(monthlyFixedPaise!, currency, locale),
              tone: "muted",
            },
            {
              label: "− Variable",
              value: formatCurrency(monthlyVariablePaise!, currency, locale),
              tone: "muted",
            },
            {
              label: "= Free cash",
              value: formatCurrency(freeCashPaise, currency, locale),
            },
          ]}
        >
          {amount}
        </LongPressBreakdown>
      ) : (
        amount
      )}

      <p className="text-xs text-(--muted)">
        {remainingFixedPaise > 0 ? (
          <>
            <span className="tabular-nums font-medium text-(--text)">
              {formatCurrency(remainingFixedPaise, currency, locale)}
            </span>{" "}
            still due this month
          </>
        ) : (
          <>All bills settled · cash is yours</>
        )}
      </p>

      {freeCashPaise > 0 ? (
        <p className="text-xs text-(--muted)">
          {projectedRunsOutAtIso ? (
            <>
              At current pace, runs out{" "}
              <span className="font-medium text-(--warning)">
                ~{formatDate(new Date(projectedRunsOutAtIso), locale)}
              </span>
            </>
          ) : (
            <>On track at current pace</>
          )}
        </p>
      ) : null}

      <div className="mt-auto pt-2">
        <Sparkline
          values={trendValues}
          width={240}
          height={32}
          className="w-full"
          ariaLabel="Free cash over the last 6 months"
        />
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-(--muted)">
          6-month trend
        </p>
      </div>
    </Card>
  );
}
