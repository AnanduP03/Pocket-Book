"use client";

import { CATEGORY_PALETTE } from "@/lib/theme/palette";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
      {CATEGORY_PALETTE.map((c) => {
        const selected = value === c.hex;
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            onClick={() => onChange(c.hex)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)",
              selected ? "border-(--text)" : "border-(--border)",
            )}
            style={{ background: c.hex }}
          >
            {selected ? (
              <Check className="h-4 w-4 text-(--text)" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
