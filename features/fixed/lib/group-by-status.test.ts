import { describe, it, expect } from "vitest";
import { groupByStatus, type StatusGroups } from "./group-by-status";
import type { PlainFixedExpense } from "@/db/repositories/fixed";

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

const now = utc(2026, 6, 22);

describe("groupByStatus", () => {
  it("returns six empty buckets for empty input", () => {
    const g: StatusGroups = groupByStatus([], now);
    expect(g.overdue).toEqual([]);
    expect(g.skipped).toEqual([]);
    expect(g.upcoming).toEqual([]);
    expect(g.paid).toEqual([]);
    expect(g.paused).toEqual([]);
    expect(g.ended).toEqual([]);
  });

  it("buckets a paid bill (lastPaid in current cycle) to PAID", () => {
    const f = fixed({ id: "a", lastPaidDate: utc(2026, 6, 1) });
    const g = groupByStatus([f], now);
    expect(g.paid).toHaveLength(1);
    expect(g.overdue).toHaveLength(0);
  });

  it("buckets an unpaid recurring bill past start date to OVERDUE", () => {
    const f = fixed({ id: "a", startDate: utc(2026, 1, 1), lastPaidDate: null });
    const g = groupByStatus([f], now);
    expect(g.overdue).toHaveLength(1);
  });

  it("buckets a future-start bill to UPCOMING", () => {
    const f = fixed({ id: "a", startDate: utc(2026, 7, 1) });
    const g = groupByStatus([f], now);
    expect(g.upcoming).toHaveLength(1);
  });

  it("buckets an inactive bill to PAUSED", () => {
    const f = fixed({ id: "a", isActive: false });
    const g = groupByStatus([f], now);
    expect(g.paused).toHaveLength(1);
  });

  it("buckets an ended bill to ENDED", () => {
    const f = fixed({
      id: "a",
      startDate: utc(2025, 1, 1),
      endDate: utc(2026, 5, 1),
    });
    const g = groupByStatus([f], now);
    expect(g.ended).toHaveLength(1);
  });

  it("buckets a skipped current cycle to SKIPPED", () => {
    const f = fixed({
      id: "a",
      startDate: utc(2026, 1, 1),
      skippedCycles: [utc(2026, 6, 1)],
    });
    const g = groupByStatus([f], now);
    expect(g.skipped).toHaveLength(1);
  });

  it("sorts OVERDUE by most-overdue first (oldest renewal first)", () => {
    const a = fixed({ id: "a", name: "Z-old", startDate: utc(2026, 1, 1) });
    const b = fixed({ id: "b", name: "A-newer", startDate: utc(2026, 5, 1) });
    const g = groupByStatus([b, a], now);
    expect(g.overdue.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("sorts UPCOMING by next-due-date ascending", () => {
    const a = fixed({ id: "a", startDate: utc(2026, 9, 1) });
    const b = fixed({ id: "b", startDate: utc(2026, 7, 1) });
    const g = groupByStatus([a, b], now);
    expect(g.upcoming.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("sorts PAID by recently-paid descending", () => {
    const a = fixed({ id: "a", lastPaidDate: utc(2026, 6, 1) });
    const b = fixed({ id: "b", lastPaidDate: utc(2026, 6, 15) });
    const g = groupByStatus([a, b], now);
    expect(g.paid.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("sorts SKIPPED and PAUSED by name", () => {
    const skippedA = fixed({
      id: "a",
      name: "Zoo",
      startDate: utc(2026, 1, 1),
      skippedCycles: [utc(2026, 6, 1)],
    });
    const skippedB = fixed({
      id: "b",
      name: "Apple",
      startDate: utc(2026, 1, 1),
      skippedCycles: [utc(2026, 6, 1)],
    });
    const pausedA = fixed({ id: "c", name: "Zebra", isActive: false });
    const pausedB = fixed({ id: "d", name: "Aardvark", isActive: false });

    const g = groupByStatus([skippedA, skippedB, pausedA, pausedB], now);
    expect(g.skipped.map((f) => f.name)).toEqual(["Apple", "Zoo"]);
    expect(g.paused.map((f) => f.name)).toEqual(["Aardvark", "Zebra"]);
  });

  it("ENDED sorted by endDate descending (most-recent ending first)", () => {
    const a = fixed({
      id: "a",
      startDate: utc(2024, 1, 1),
      endDate: utc(2025, 1, 1),
    });
    const b = fixed({
      id: "b",
      startDate: utc(2024, 1, 1),
      endDate: utc(2026, 4, 1),
    });
    const g = groupByStatus([a, b], now);
    expect(g.ended.map((f) => f.id)).toEqual(["b", "a"]);
  });
});
