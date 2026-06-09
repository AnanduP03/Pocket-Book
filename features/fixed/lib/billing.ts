import { addDays, addMonths, addYears } from "date-fns";
import type { IntervalUnit } from "@/db/models/FixedExpense";

export type Rule = {
  startDate: Date;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  endDate: Date | null;
};

export type Status = "paid" | "overdue" | "upcoming" | "ended" | "inactive";

const SAFETY_LIMIT = 10_000;

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

export function nextRenewalDate(rule: Rule, ref: Date): Date | null {
  const refDay = utcStartOfDay(ref);
  const startDay = utcStartOfDay(rule.startDate);
  const endDay = rule.endDate ? utcStartOfDay(rule.endDate) : null;

  if (refDay.getTime() <= startDay.getTime()) {
    if (endDay && startDay.getTime() > endDay.getTime()) return null;
    return startDay;
  }

  for (let n = 1; n < SAFETY_LIMIT; n++) {
    const d = nthRenewal(rule, n);
    if (d.getTime() >= refDay.getTime()) {
      if (endDay && d.getTime() > endDay.getTime()) return null;
      return d;
    }
  }
  return null;
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

  for (let n = 0; n < SAFETY_LIMIT; n++) {
    const cycleStart = nthRenewal(rule, n);
    const next = nthRenewal(rule, n + 1);
    if (next.getTime() > refDay.getTime()) {
      let cycleEnd = utcStartOfDay(addDays(next, -1));
      if (endDay && cycleEnd.getTime() > endDay.getTime()) cycleEnd = endDay;
      return { start: cycleStart, end: cycleEnd };
    }
  }
  return null;
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

export function deriveStatus(
  rule: Rule,
  lastPaidDate: Date | null,
  ref: Date,
  isActive: boolean = true,
): Status {
  if (!isActive) return "inactive";
  const refDay = utcStartOfDay(ref);
  const startDay = utcStartOfDay(rule.startDate);
  if (refDay.getTime() < startDay.getTime()) return "upcoming";
  if (rule.endDate && refDay.getTime() > utcStartOfDay(rule.endDate).getTime()) {
    return "ended";
  }
  return isPaidThisCycle(rule, lastPaidDate, ref) ? "paid" : "overdue";
}

export function renewalsInRange(rule: Rule, start: Date, end: Date): Date[] {
  if (start.getTime() > end.getTime()) return [];
  const startDay = utcStartOfDay(start);
  const endDay = utcStartOfDay(end);
  const ruleEnd = rule.endDate ? utcStartOfDay(rule.endDate) : null;
  const upper =
    ruleEnd && ruleEnd.getTime() < endDay.getTime() ? ruleEnd : endDay;

  const out: Date[] = [];
  for (let n = 0; n < SAFETY_LIMIT; n++) {
    const d = nthRenewal(rule, n);
    if (d.getTime() > upper.getTime()) break;
    if (d.getTime() >= startDay.getTime()) out.push(d);
  }
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  const ms =
    utcStartOfDay(b).getTime() - utcStartOfDay(a).getTime();
  return Math.round(ms / 86_400_000);
}
