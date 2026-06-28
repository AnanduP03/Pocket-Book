import { Activity, AlertTriangle, Sparkles, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpendingClimate } from "../queries";

type Props = {
  climate: SpendingClimate;
};

/**
 * One-word weather report for the current month. Sits above the dashboard
 * hero numbers as a fast pulse-check without forcing the user to read
 * digits.
 *
 * Tone:
 *   surplus → success (green-ish)
 *   steady  → muted (calm)
 *   brisk   → accent (lavender, attention without alarm)
 *   tight   → warning (amber)
 *
 * Copy stays single-word so it reads at a glance. The icon reinforces.
 */
const CONFIG: Record<
  SpendingClimate,
  {
    label: string;
    detail: string;
    Icon: typeof Activity;
    tone: string;
  }
> = {
  surplus: {
    label: "Surplus",
    detail: "On track to end the month with room to spare.",
    Icon: Sparkles,
    tone: "border-(--success)/40 bg-(--success)/15 text-(--text)",
  },
  steady: {
    label: "Steady",
    detail: "Spending is in line with your typical month.",
    Icon: Activity,
    tone: "border-(--border) bg-(--surface-2)/50 text-(--text)",
  },
  brisk: {
    label: "Brisk",
    detail: "Variable spending is running ahead of your usual pace.",
    Icon: Wind,
    tone: "border-(--accent)/40 bg-(--accent)/15 text-(--text)",
  },
  tight: {
    label: "Tight",
    detail: "Projected to end the month negative — ease up or sweep cover.",
    Icon: AlertTriangle,
    tone: "border-(--warning)/40 bg-(--warning)/20 text-(--text)",
  },
};

export function SpendingClimatePill({ climate }: Props) {
  const cfg = CONFIG[climate];
  const Icon = cfg.Icon;
  return (
    <div
      role="status"
      aria-label={`Spending climate: ${cfg.label}. ${cfg.detail}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        cfg.tone,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="uppercase tracking-[0.16em]">{cfg.label}</span>
      <span className="hidden text-(--muted) sm:inline">· {cfg.detail}</span>
    </div>
  );
}
