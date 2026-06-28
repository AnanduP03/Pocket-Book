import {
  deriveStatus,
  nextRenewalDate,
  ruleOf,
} from "./billing";
import type { PlainFixedExpense } from "@/db/repositories/fixed";

export type StatusGroups = {
  overdue: PlainFixedExpense[];
  skipped: PlainFixedExpense[];
  upcoming: PlainFixedExpense[];
  paid: PlainFixedExpense[];
  paused: PlainFixedExpense[];
  ended: PlainFixedExpense[];
};

/**
 * Bucket fixed expenses by display status with a smart per-section sort.
 * The display model maps the billing engine's "inactive" status onto
 * "paused" since the UI calls them the same thing.
 */
export function groupByStatus(
  items: PlainFixedExpense[],
  now: Date = new Date(),
): StatusGroups {
  const out: StatusGroups = {
    overdue: [],
    skipped: [],
    upcoming: [],
    paid: [],
    paused: [],
    ended: [],
  };

  for (const f of items) {
    const status = deriveStatus(
      ruleOf(f),
      f.lastPaidDate ? new Date(f.lastPaidDate) : null,
      now,
      f.isActive,
      f.skippedCycles ?? null,
    );
    switch (status) {
      case "overdue":
        out.overdue.push(f);
        break;
      case "skipped":
        out.skipped.push(f);
        break;
      case "upcoming":
        out.upcoming.push(f);
        break;
      case "paid":
        out.paid.push(f);
        break;
      case "inactive":
        out.paused.push(f);
        break;
      case "ended":
        out.ended.push(f);
        break;
    }
  }

  out.overdue.sort((a, b) => {
    const at = a.startDate.getTime();
    const bt = b.startDate.getTime();
    return at - bt;
  });
  out.skipped.sort((a, b) => a.name.localeCompare(b.name));
  out.upcoming.sort((a, b) => {
    const an = nextRenewalDate(ruleOf(a), now);
    const bn = nextRenewalDate(ruleOf(b), now);
    const at = an ? an.getTime() : Infinity;
    const bt = bn ? bn.getTime() : Infinity;
    return at - bt;
  });
  out.paid.sort((a, b) => {
    const at = a.lastPaidDate ? new Date(a.lastPaidDate).getTime() : 0;
    const bt = b.lastPaidDate ? new Date(b.lastPaidDate).getTime() : 0;
    return bt - at;
  });
  out.paused.sort((a, b) => a.name.localeCompare(b.name));
  out.ended.sort((a, b) => {
    const at = a.endDate ? new Date(a.endDate).getTime() : 0;
    const bt = b.endDate ? new Date(b.endDate).getTime() : 0;
    return bt - at;
  });

  return out;
}
