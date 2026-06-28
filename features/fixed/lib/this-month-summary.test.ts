import { describe, it, expect } from "vitest";
import { thisMonthSummary } from "./this-month-summary";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainPayment } from "@/db/repositories/payments";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

function fixed(overrides: Partial<PlainFixedExpense> = {}): PlainFixedExpense {
  return {
    id: overrides.id ?? "f1",
    name: overrides.name ?? "Bill",
    amountPaise: 1000,
    categoryId: "c1",
    isActive: true,
    isAutoDebit: false,
    startDate: utc(2026, 1, 1),
    intervalValue: 1,
    intervalUnit: "month",
    endDate: null,
    lastPaidDate: null,
    skippedCycles: [],
    note: null,
    createdAt: utc(2026, 1, 1),
    updatedAt: utc(2026, 1, 1),
    ...overrides,
  };
}

function payment(overrides: Partial<PlainPayment> = {}): PlainPayment {
  return {
    id: overrides.id ?? "p1",
    fixedExpenseId: overrides.fixedExpenseId ?? "f1",
    paidDate: utc(2026, 6, 5),
    amountPaise: 1000,
    note: null,
    usedThisCycle: null,
    createdAt: utc(2026, 6, 5),
    updatedAt: utc(2026, 6, 5),
    ...overrides,
  };
}

const now = utc(2026, 6, 22);

describe("thisMonthSummary", () => {
  it("returns zeros when no items", () => {
    const r = thisMonthSummary([], [], now);
    expect(r).toEqual({ duePaise: 0, paidPaise: 0, remainingPaise: 0, overdueCount: 0 });
  });

  it("counts a monthly bill as one renewal due in the month", () => {
    const f = fixed({ id: "a", amountPaise: 5000, startDate: utc(2026, 1, 1) });
    const r = thisMonthSummary([f], [], now);
    expect(r.duePaise).toBe(5000);
  });

  it("ignores inactive bills", () => {
    const f = fixed({ id: "a", amountPaise: 5000, isActive: false });
    const r = thisMonthSummary([f], [], now);
    expect(r.duePaise).toBe(0);
  });

  it("excludes skipped cycles from due", () => {
    const f = fixed({
      id: "a",
      amountPaise: 5000,
      startDate: utc(2026, 1, 1),
      skippedCycles: [utc(2026, 6, 1)],
    });
    const r = thisMonthSummary([f], [], now);
    expect(r.duePaise).toBe(0);
  });

  it("sums paid amount from payments inside the current month", () => {
    const f = fixed({ id: "a", amountPaise: 5000, startDate: utc(2026, 1, 1) });
    const p = payment({ fixedExpenseId: "a", paidDate: utc(2026, 6, 5), amountPaise: 5000 });
    const r = thisMonthSummary([f], [p], now);
    expect(r.paidPaise).toBe(5000);
  });

  it("ignores payments outside the current month", () => {
    const f = fixed({ id: "a", amountPaise: 5000, startDate: utc(2026, 1, 1) });
    const p = payment({ fixedExpenseId: "a", paidDate: utc(2026, 5, 15), amountPaise: 5000 });
    const r = thisMonthSummary([f], [p], now);
    expect(r.paidPaise).toBe(0);
  });

  it("computes remaining as max(0, due - paid)", () => {
    const f = fixed({ id: "a", amountPaise: 5000, startDate: utc(2026, 1, 1) });
    const r = thisMonthSummary([f], [], now);
    expect(r.remainingPaise).toBe(5000);
    const r2 = thisMonthSummary([f], [payment({ fixedExpenseId: "a", amountPaise: 3000 })], now);
    expect(r2.remainingPaise).toBe(2000);
    const r3 = thisMonthSummary([f], [payment({ fixedExpenseId: "a", amountPaise: 9000 })], now);
    expect(r3.remainingPaise).toBe(0);
  });

  it("counts overdue items via deriveStatus", () => {
    const overdueA = fixed({ id: "a", startDate: utc(2026, 1, 1), lastPaidDate: null });
    const paidB = fixed({ id: "b", startDate: utc(2026, 1, 1), lastPaidDate: utc(2026, 6, 1) });
    const r = thisMonthSummary([overdueA, paidB], [], now);
    expect(r.overdueCount).toBe(1);
  });

  it("handles a quarterly bill in a non-renewal month (zero due)", () => {
    const f = fixed({
      id: "a",
      amountPaise: 5000,
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      intervalValue: 3,
    });
    // June is not a quarter renewal (Jan, Apr, Jul). Renewals = 0.
    const r = thisMonthSummary([f], [], now);
    expect(r.duePaise).toBe(0);
  });
});
