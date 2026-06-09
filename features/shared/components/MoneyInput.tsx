"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  currencySymbol,
  minorToInputString,
  parseAmountToMinor,
} from "@/lib/format/money";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  valueMinor: number;
  onChangeMinor: (minor: number) => void;
  currency?: string;
  locale?: string;
};

export function MoneyInput({
  valueMinor,
  onChangeMinor,
  currency = "INR",
  locale = "en-IN",
  className,
  ...props
}: Props) {
  const symbol = currencySymbol(currency, locale);
  const [draft, setDraft] = React.useState(() =>
    minorToInputString(valueMinor, currency),
  );

  React.useEffect(() => {
    const parsed = parseAmountToMinor(draft, currency);
    if (parsed !== valueMinor) {
      setDraft(minorToInputString(valueMinor, currency));
    }
  }, [valueMinor, currency, draft]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setDraft(next);
    const minor = parseAmountToMinor(next, currency);
    onChangeMinor(minor ?? 0);
  }

  function handleBlur() {
    if (valueMinor > 0) {
      setDraft(minorToInputString(valueMinor, currency));
    }
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--muted)"
      >
        {symbol}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("pl-8 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
