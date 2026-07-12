import { resolveIcon } from "../lib/icons";
import { cn } from "@/lib/utils";

export function CategoryIcon({
  name,
  color,
  className,
  size = "md",
}: {
  name: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = resolveIcon(name);
  const dim = {
    sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5" },
    md: { box: "h-9 w-9", icon: "h-4 w-4" },
    lg: { box: "h-12 w-12", icon: "h-6 w-6" },
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)",
        dim.box,
        className,
      )}
    >
      <Icon className={dim.icon} style={{ color }} strokeWidth={2.25} />
    </span>
  );
}
