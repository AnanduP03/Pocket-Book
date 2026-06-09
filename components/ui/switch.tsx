"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
  className,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        // Visible 20×36 track wrapped in a 44×44 hit area for thumbs on mobile.
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-(--accent)" : "bg-(--surface-2)",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-(--surface) shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
