"use client";

import { ICON_NAMES, ICON_MAP, type IconName } from "../lib/icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: IconName) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Icon"
      className="grid grid-cols-7 gap-1.5 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 p-2 sm:max-h-44 sm:overflow-y-auto"
    >
      {ICON_NAMES.map((name) => {
        const Icon = ICON_MAP[name];
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
              selected
                ? "bg-(--accent)/40 text-(--text)"
                : "text-(--muted) hover:bg-(--surface) hover:text-(--text)",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
