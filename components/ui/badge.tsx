import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "muted" | "warning" | "danger";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  const tones = {
    default: "bg-(--accent)/30 text-(--text)",
    muted: "bg-(--surface-2) text-(--muted)",
    warning: "bg-(--warning)/40 text-(--text)",
    danger: "bg-(--danger)/40 text-(--text)",
  } satisfies Record<NonNullable<BadgeProps["tone"]>, string>;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
