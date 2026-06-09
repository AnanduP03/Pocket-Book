"use client";

import { cn } from "@/lib/utils";
import type { CategoryType } from "@/db/models/Category";

const OPTIONS: { value: CategoryType; label: string; help: string }[] = [
  { value: "Fixed", label: "Fixed", help: "Recurring commitments" },
  { value: "Variable", label: "Variable", help: "One-off spending" },
];

export function TypePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: CategoryType;
  onChange: (t: CategoryType) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Category type"
      className="grid grid-cols-2 gap-0.5 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2) p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            title={opt.help}
            className={cn(
              "rounded-[var(--radius-input)] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:opacity-50",
              active
                ? "bg-(--surface) text-(--text) shadow-sm"
                : "text-(--muted) hover:text-(--text)",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
