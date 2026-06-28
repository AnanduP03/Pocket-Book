import type { MonthlyTotal } from "../queries";

const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type ForecastPoint = {
  label: string;
  year: number;
  month: number;
  meanSpendPaise: number;
  lowSpendPaise: number;
  highSpendPaise: number;
  forecastIncomePaise: number;
};

function meanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (values.length === 1) return { mean, std: 0 };
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
    (values.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Project the next `monthsAhead` months from the trailing monthly history.
 * The forecast cone is built from a 1σ band around the mean of the last
 * MIN(6, history.length) months. Months with zero income are excluded
 * from the income projection so a brand-new account doesn't anchor the
 * income line at ₹0.
 *
 * Returns an empty array when there's < 2 months of history (not enough
 * to estimate a sensible spread).
 */
export function buildForecast(
  history: MonthlyTotal[],
  monthsAhead: number = 3,
): ForecastPoint[] {
  if (history.length < 2) return [];

  const tail = history.slice(-6);
  const totalSpend = tail.map((m) => m.fixedPaise + m.variablePaise);
  const incomes = tail.map((m) => m.incomePaise).filter((v) => v > 0);

  const spendStats = meanAndStd(totalSpend);
  const incomeStats = meanAndStd(incomes);

  const last = history[history.length - 1]!;
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= monthsAhead; i++) {
    const year =
      last.month + i > 11
        ? last.year + Math.floor((last.month + i) / 12)
        : last.year;
    const month = (last.month + i) % 12;
    out.push({
      label: `${MONTH_LABELS_SHORT[month]} ${String(year).slice(-2)}`,
      year,
      month,
      meanSpendPaise: Math.max(0, Math.round(spendStats.mean)),
      lowSpendPaise: Math.max(0, Math.round(spendStats.mean - spendStats.std)),
      highSpendPaise: Math.max(0, Math.round(spendStats.mean + spendStats.std)),
      forecastIncomePaise: Math.max(0, Math.round(incomeStats.mean)),
    });
  }
  return out;
}
