"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IntervalUnit } from "@/db/models/FixedExpense";

const UNITS: { value: IntervalUnit; label: string; singular: string; plural: string }[] = [
  { value: "day", label: "Day", singular: "day", plural: "days" },
  { value: "week", label: "Week", singular: "week", plural: "weeks" },
  { value: "month", label: "Month", singular: "month", plural: "months" },
  { value: "year", label: "Year", singular: "year", plural: "years" },
];

type Props = {
  intervalValue: number;
  intervalUnit: IntervalUnit;
  onIntervalValueChange: (n: number) => void;
  onIntervalUnitChange: (u: IntervalUnit) => void;
};

export function IntervalPicker({
  intervalValue,
  intervalUnit,
  onIntervalValueChange,
  onIntervalUnitChange,
}: Props) {
  const unit =
    UNITS.find((u) => u.value === intervalUnit) ?? (UNITS[2] as (typeof UNITS)[number]);
  const noun = intervalValue === 1 ? unit.singular : unit.plural;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Repeat unit"
        className="grid grid-cols-4 gap-0.5 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2) p-0.5"
      >
        {UNITS.map((u) => {
          const active = intervalUnit === u.value;
          return (
            <button
              key={u.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onIntervalUnitChange(u.value)}
              className={cn(
                "rounded-[var(--radius-input)] px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
                active
                  ? "bg-(--surface) text-(--text) shadow-sm"
                  : "text-(--muted) hover:text-(--text)",
              )}
            >
              {u.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-(--muted)">Repeat every</span>
        <Input
          type="number"
          min={1}
          max={365}
          value={intervalValue}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= 365) {
              onIntervalValueChange(n);
            } else if (e.target.value === "") {
              onIntervalValueChange(1);
            }
          }}
          className="w-20 tabular-nums"
        />
        <span className="text-sm text-(--muted)">{noun}</span>
      </div>
    </div>
  );
}
