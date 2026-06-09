"use client";

import { CheckCircle2, AlertCircle, Clock, CircleDashed, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  daysBetween,
  deriveStatus,
  nextRenewalDate,
  type Rule,
  type Status,
} from "../lib/billing";
import { formatDate } from "@/lib/format/date";

type Props = {
  rule: Rule;
  lastPaidDate: Date | null;
  isActive: boolean;
  locale?: string;
};

const STYLES: Record<Status, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  paid: {
    bg: "bg-(--success)/30",
    text: "text-(--text)",
    icon: CheckCircle2,
  },
  overdue: {
    bg: "bg-(--warning)/40",
    text: "text-(--text)",
    icon: AlertCircle,
  },
  upcoming: {
    bg: "bg-(--surface-2)",
    text: "text-(--muted)",
    icon: Clock,
  },
  ended: {
    bg: "bg-(--surface-2)",
    text: "text-(--muted)",
    icon: CircleDashed,
  },
  inactive: {
    bg: "bg-(--surface-2)",
    text: "text-(--muted)",
    icon: Pause,
  },
};

export function StatusChip({
  rule,
  lastPaidDate,
  isActive,
  locale = "en-IN",
}: Props) {
  const now = new Date();
  const status = deriveStatus(rule, lastPaidDate, now, isActive);
  const next = nextRenewalDate(rule, now);
  const Icon = STYLES[status].icon;

  let label = "";
  switch (status) {
    case "paid":
      label = next ? `Paid · Renews ${formatDate(next, locale)}` : "Paid";
      break;
    case "overdue": {
      // Overdue by N days: today − cycleStart
      // simpler: today − lastRenewalOnOrBeforeToday. Use cycleBoundsAt indirectly:
      const renewal = nextRenewalDate(rule, now);
      // overdue means current cycle has started; "since" date is the renewal closest to but ≤ today
      // Approximation: cycle start = next - interval. We'll instead show "Overdue".
      const days = renewal ? daysBetween(renewal, now) : 0;
      label = days > 0 ? `Overdue by ${days}d` : "Overdue";
      break;
    }
    case "upcoming":
      label = next ? `Starts ${formatDate(next, locale)}` : "Upcoming";
      break;
    case "ended":
      label = "Ended";
      break;
    case "inactive":
      label = "Paused";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status].bg,
        STYLES[status].text,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
