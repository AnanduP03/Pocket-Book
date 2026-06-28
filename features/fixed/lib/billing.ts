import { addDays, addMonths, addYears } from "date-fns";
import type { IntervalUnit } from "@/db/models/FixedExpense";
import type { PlainFixedExpense } from "@/db/repositories/fixed";

export type Rule = {
  startDate: Date;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  endDate: Date | null;
};

export type Status = "paid" | "overdue" | "upcoming" | "ended" | "inactive" | "skipped";

const DAY_MS = 86_400_000;

export function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addInterval(d: Date, value: number, unit: IntervalUnit): Date {
  switch (unit) {
    case "day":
      return addDays(d, value);
    case "week":
      return addDays(d, value * 7);
    case "month":
      return addMonths(d, value);
    case "year":
      return addYears(d, value);
  }
}

function nthRenewal(rule: Rule, n: number): Date {
  return utcStartOfDay(
    addInterval(rule.startDate, n * rule.intervalValue, rule.intervalUnit),
  );
}

/**
 * Smallest n such that nthRenewal(rule, n) >= refDay. Closed-form for
 * fixed-stride units (day / week) and an approximate-then-correct
 * computation for month / year (corrects for date-fns's month-end
 * clamping — Jan 31 → Feb 28 — which can shift the approximation by
 * at most one cycle in either direction).
 */
function firstRenewalIndexAtOrAfter(rule: Rule, refDay: Date): number {
  const startDay = utcStartOfDay(rule.startDate);
  if (refDay.getTime() <= startDay.getTime()) return 0;

  let n: number;
  switch (rule.intervalUnit) {
    case "day":
      n = Math.ceil(
        (refDay.getTime() - startDay.getTime()) /
          (rule.intervalValue * DAY_MS),
      );
      break;
    case "week":
      n = Math.ceil(
        (refDay.getTime() - startDay.getTime()) /
          (rule.intervalValue * 7 * DAY_MS),
      );
      break;
    case "month": {
      const months =
        (refDay.getUTCFullYear() - startDay.getUTCFullYear()) * 12 +
        (refDay.getUTCMonth() - startDay.getUTCMonth());
      n = Math.ceil(months / rule.intervalValue);
      break;
    }
    case "year": {
      const years = refDay.getUTCFullYear() - startDay.getUTCFullYear();
      n = Math.ceil(years / rule.intervalValue);
      break;
    }
  }
  if (n < 0) n = 0;
  // Clamping correction. In practice this loops 0–1 times.
  while (n > 0 && nthRenewal(rule, n - 1).getTime() >= refDay.getTime()) n--;
  while (nthRenewal(rule, n).getTime() < refDay.getTime()) n++;
  return n;
}

export function nextRenewalDate(rule: Rule, ref: Date): Date | null {
  const refDay = utcStartOfDay(ref);
  const startDay = utcStartOfDay(rule.startDate);
  const endDay = rule.endDate ? utcStartOfDay(rule.endDate) : null;

  if (refDay.getTime() <= startDay.getTime()) {
    if (endDay && startDay.getTime() > endDay.getTime()) return null;
    return startDay;
  }
  const n = firstRenewalIndexAtOrAfter(rule, refDay);
  const d = nthRenewal(rule, n);
  if (endDay && d.getTime() > endDay.getTime()) return null;
  return d;
}

export function cycleBoundsAt(
  rule: Rule,
  ref: Date,
): { start: Date; end: Date } | null {
  const refDay = utcStartOfDay(ref);
  const startDay = utcStartOfDay(rule.startDate);
  const endDay = rule.endDate ? utcStartOfDay(rule.endDate) : null;

  if (refDay.getTime() < startDay.getTime()) return null;
  if (endDay && refDay.getTime() > endDay.getTime()) return null;

  const n = firstRenewalIndexAtOrAfter(rule, refDay);
  // If refDay lands exactly on nthRenewal(n) the cycle starts at n;
  // otherwise refDay sits inside the previous cycle (n - 1).
  const cycleN =
    nthRenewal(rule, n).getTime() === refDay.getTime() ? n : n - 1;
  const cycleStart = nthRenewal(rule, cycleN);
  let cycleEnd = utcStartOfDay(addDays(nthRenewal(rule, cycleN + 1), -1));
  if (endDay && cycleEnd.getTime() > endDay.getTime()) cycleEnd = endDay;
  return { start: cycleStart, end: cycleEnd };
}

export function isPaidThisCycle(
  rule: Rule,
  lastPaidDate: Date | null,
  ref: Date,
): boolean {
  if (!lastPaidDate) return false;
  const bounds = cycleBoundsAt(rule, ref);
  if (!bounds) return false;
  const lp = utcStartOfDay(lastPaidDate);
  return (
    lp.getTime() >= bounds.start.getTime() &&
    lp.getTime() <= bounds.end.getTime()
  );
}

export function isSkippedCycle(
  skippedCycles: Date[] | null | undefined,
  cycleStart: Date,
): boolean {
  if (!skippedCycles || skippedCycles.length === 0) return false;
  const target = utcStartOfDay(cycleStart).getTime();
  for (const s of skippedCycles) {
    if (utcStartOfDay(s).getTime() === target) return true;
  }
  return false;
}

export function isSkippedThisCycle(
  rule: Rule,
  skippedCycles: Date[] | null | undefined,
  ref: Date,
): boolean {
  if (!skippedCycles || skippedCycles.length === 0) return false;
  const bounds = cycleBoundsAt(rule, ref);
  if (!bounds) return false;
  return isSkippedCycle(skippedCycles, bounds.start);
}

export function deriveStatus(
  rule: Rule,
  lastPaidDate: Date | null,
  ref: Date,
  isActive: boolean = true,
  skippedCycles: Date[] | null = null,
): Status {
  if (!isActive) return "inactive";
  const refDay = utcStartOfDay(ref);
  const startDay = utcStartOfDay(rule.startDate);
  if (refDay.getTime() < startDay.getTime()) return "upcoming";
  if (rule.endDate && refDay.getTime() > utcStartOfDay(rule.endDate).getTime()) {
    return "ended";
  }
  if (isPaidThisCycle(rule, lastPaidDate, ref)) return "paid";
  if (isSkippedThisCycle(rule, skippedCycles, ref)) return "skipped";
  return "overdue";
}

export function renewalsInRange(
  rule: Rule,
  start: Date,
  end: Date,
  skippedCycles: Date[] | null = null,
): Date[] {
  if (start.getTime() > end.getTime()) return [];
  const startDay = utcStartOfDay(start);
  const endDay = utcStartOfDay(end);
  const ruleEnd = rule.endDate ? utcStartOfDay(rule.endDate) : null;
  const upper =
    ruleEnd && ruleEnd.getTime() < endDay.getTime() ? ruleEnd : endDay;

  const out: Date[] = [];
  // Start at the first renewal at-or-after the window's lower bound;
  // each subsequent renewal is strictly later, so the loop stops as
  // soon as we cross `upper`. Bounded by the number of renewals in the
  // window — no SAFETY_LIMIT needed.
  let n = firstRenewalIndexAtOrAfter(rule, startDay);
  while (true) {
    const d = nthRenewal(rule, n);
    if (d.getTime() > upper.getTime()) break;
    if (d.getTime() >= startDay.getTime()) {
      if (!skippedCycles || !isSkippedCycle(skippedCycles, d)) out.push(d);
    }
    n++;
  }
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  const ms =
    utcStartOfDay(b).getTime() - utcStartOfDay(a).getTime();
  return Math.round(ms / DAY_MS);
}

export function annualOccurrences(rule: Rule, ref: Date = new Date()): number {
  const refDay = utcStartOfDay(ref);
  if (rule.endDate && utcStartOfDay(rule.endDate).getTime() < refDay.getTime()) {
    return 0;
  }
  switch (rule.intervalUnit) {
    case "day":
      return 365 / rule.intervalValue;
    case "week":
      return 52 / rule.intervalValue;
    case "month":
      return 12 / rule.intervalValue;
    case "year":
      return 1 / rule.intervalValue;
  }
}

/**
 * Build a billing-engine `Rule` from a stored fixed expense. Hoisted
 * here so callers don't each maintain identical inline copies.
 */
export function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
}
