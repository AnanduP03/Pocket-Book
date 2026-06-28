"use client";

import {
  CheckCircle2,
  AlertCircle,
  Clock,
  CircleDashed,
  Pause,
  SkipForward,
} from "lucide-react";
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
  skippedCycles?: Date[] | null;
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
  skipped: {
    bg: "bg-(--surface-2)",
    text: "text-(--muted)",
    icon: SkipForward,
  },
};

export function StatusChip({
  rule,
  lastPaidDate,
  isActive,
  skippedCycles = null,
  locale = "en-IN",
}: Props) {
  const now = new Date();
  const status = deriveStatus(rule, lastPaidDate, now, isActive, skippedCycles);
  const Icon = STYLES[status].icon;

  let label = "";
  switch (status) {
    case "paid":
      label = "Paid";
      break;
    case "overdue": {
      const renewal = nextRenewalDate(rule, now);
      const days = renewal ? daysBetween(renewal, now) : 0;
      label = days > 0 ? `Overdue by ${days}d` : "Overdue";
      break;
    }
    case "upcoming": {
      const next = nextRenewalDate(rule, now);
      label = next ? `Starts ${formatDate(next, locale)}` : "Upcoming";
      break;
    }
    case "ended":
      label = "Ended";
      break;
    case "inactive":
      label = "Paused";
      break;
    case "skipped":
      label = "Skipped";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium max-w-full",
        STYLES[status].bg,
        STYLES[status].text,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
