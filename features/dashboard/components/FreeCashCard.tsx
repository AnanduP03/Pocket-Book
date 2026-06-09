import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
  freeCashPaise: number;
  incomePaise: number;
  fixedPaise: number;
  variablePaise: number;
};

export function FreeCashCard({
  currency,
  locale,
  freeCashPaise,
  incomePaise,
  fixedPaise,
  variablePaise,
}: Props) {
  const positive = freeCashPaise >= 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Free cash</CardTitle>
          <CardDescription>This month</CardDescription>
        </div>
      </CardHeader>
      <p
        className={
          positive
            ? "tabular-nums text-4xl font-semibold tracking-tight text-(--text) lg:text-5xl"
            : "tabular-nums text-4xl font-semibold tracking-tight text-(--danger) lg:text-5xl"
        }
      >
        {formatCurrency(freeCashPaise, currency, locale)}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-(--muted)">
        <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 p-2">
          <p className="uppercase tracking-wide">Income</p>
          <p className="mt-0.5 tabular-nums text-sm font-medium text-(--text)">
            +{formatCurrency(incomePaise, currency, locale)}
          </p>
        </div>
        <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 p-2">
          <p className="uppercase tracking-wide">Fixed</p>
          <p className="mt-0.5 tabular-nums text-sm font-medium text-(--text)">
            −{formatCurrency(fixedPaise, currency, locale)}
          </p>
        </div>
        <div className="rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 p-2">
          <p className="uppercase tracking-wide">Variable</p>
          <p className="mt-0.5 tabular-nums text-sm font-medium text-(--text)">
            −{formatCurrency(variablePaise, currency, locale)}
          </p>
        </div>
      </div>
    </Card>
  );
}
