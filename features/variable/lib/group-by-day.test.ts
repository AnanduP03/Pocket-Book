import { describe, it, expect } from "vitest";
import { groupByDay } from "./group-by-day";
import type { PlainVariable } from "@/db/repositories/variable";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

function variable(date: Date, id: string): PlainVariable {
  return {
    id,
    date,
    amountPaise: 100,
    currency: "INR",
    categoryId: "c1",
    note: null,
    tags: [],
    createdAt: date,
    updatedAt: date,
  };
}

const now = utc(2026, 6, 18); // Thursday Jun 18 2026

describe("groupByDay", () => {
  it("returns empty array for empty input", () => {
    expect(groupByDay([], "en-US", now)).toEqual([]);
  });

  it("labels today's items as TODAY", () => {
    const groups = groupByDay([variable(utc(2026, 6, 18), "a")], "en-US", now);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("TODAY");
    expect(groups[0]?.items).toHaveLength(1);
  });

  it("labels yesterday's items as YESTERDAY", () => {
    const groups = groupByDay([variable(utc(2026, 6, 17), "a")], "en-US", now);
    expect(groups[0]?.label).toBe("YESTERDAY");
  });

  it("labels 2-6 days ago by named weekday", () => {
    // Jun 14 2026 is a Sunday; 4 days before Thursday Jun 18.
    const groups = groupByDay([variable(utc(2026, 6, 14), "a")], "en-US", now);
    expect(groups[0]?.label).toMatch(/Sunday/i);
  });

  it("labels 7+ days ago with a numeric date", () => {
    const groups = groupByDay([variable(utc(2026, 6, 1), "a")], "en-US", now);
    // No "TODAY" / "YESTERDAY" / weekday name — numeric form like "Jun 1".
    expect(groups[0]?.label).not.toMatch(/today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
    expect(groups[0]?.label.length).toBeGreaterThan(0);
  });

  it("groups multiple items on the same day under one label", () => {
    const groups = groupByDay(
      [
        variable(utc(2026, 6, 18), "a"),
        variable(utc(2026, 6, 18), "b"),
        variable(utc(2026, 6, 17), "c"),
      ],
      "en-US",
      now,
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[1]?.items).toHaveLength(1);
  });

  it("preserves input order within a day (caller is responsible for sort)", () => {
    const a = variable(utc(2026, 6, 18), "a");
    const b = variable(utc(2026, 6, 18), "b");
    const groups = groupByDay([a, b], "en-US", now);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns groups in input order (caller sorts; helper preserves)", () => {
    const groups = groupByDay(
      [variable(utc(2026, 6, 18), "today"), variable(utc(2026, 6, 17), "yesterday")],
      "en-US",
      now,
    );
    expect(groups[0]?.label).toBe("TODAY");
    expect(groups[1]?.label).toBe("YESTERDAY");
  });

  it("exposes a stable date key on each group", () => {
    const groups = groupByDay([variable(utc(2026, 6, 17), "a")], "en-US", now);
    expect(groups[0]?.dateKey).toBe("2026-06-17");
  });
});
