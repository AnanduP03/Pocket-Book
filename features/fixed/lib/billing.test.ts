import { describe, it, expect } from "vitest";
import {
  cycleBoundsAt,
  deriveStatus,
  isPaidThisCycle,
  nextRenewalDate,
  renewalsInRange,
  type Rule,
} from "./billing";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const baseRule = (
  o: Partial<Rule> & Pick<Rule, "startDate" | "intervalUnit">,
): Rule => ({
  intervalValue: 1,
  endDate: null,
  ...o,
});

describe("nextRenewalDate", () => {
  it("returns startDate when ref is before start", () => {
    const r = baseRule({ startDate: utc(2026, 3, 1), intervalUnit: "month" });
    expect(iso(nextRenewalDate(r, utc(2026, 1, 15)))).toBe("2026-03-01");
  });

  it("returns startDate when ref equals start", () => {
    const r = baseRule({ startDate: utc(2026, 3, 1), intervalUnit: "month" });
    expect(iso(nextRenewalDate(r, utc(2026, 3, 1)))).toBe("2026-03-01");
  });

  it("returns next monthly renewal mid-cycle", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(iso(nextRenewalDate(r, utc(2026, 1, 15)))).toBe("2026-02-01");
  });

  it("clamps day-31 monthly to month length", () => {
    const r = baseRule({ startDate: utc(2026, 1, 31), intervalUnit: "month" });
    expect(iso(nextRenewalDate(r, utc(2026, 2, 1)))).toBe("2026-02-28");
    expect(iso(nextRenewalDate(r, utc(2026, 3, 1)))).toBe("2026-03-31");
    expect(iso(nextRenewalDate(r, utc(2026, 4, 1)))).toBe("2026-04-30");
  });

  it("yearly Feb 29 clamps to Feb 28 in non-leap years", () => {
    const r = baseRule({ startDate: utc(2024, 2, 29), intervalUnit: "year" });
    expect(iso(nextRenewalDate(r, utc(2024, 3, 1)))).toBe("2025-02-28");
    expect(iso(nextRenewalDate(r, utc(2027, 1, 1)))).toBe("2027-02-28");
    expect(iso(nextRenewalDate(r, utc(2028, 1, 1)))).toBe("2028-02-29");
  });

  it("daily interval=7 equivalent to weekly interval=1", () => {
    const a = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "day",
      intervalValue: 7,
    });
    const b = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "week" });
    for (let d = 1; d <= 30; d += 3) {
      const ref = utc(2026, 1, d);
      expect(iso(nextRenewalDate(a, ref))).toBe(iso(nextRenewalDate(b, ref)));
    }
  });

  it("returns null past endDate", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 6, 1),
    });
    expect(iso(nextRenewalDate(r, utc(2026, 7, 1)))).toBe(null);
  });

  it("returns last valid renewal at endDate boundary", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 6, 1),
    });
    expect(iso(nextRenewalDate(r, utc(2026, 6, 1)))).toBe("2026-06-01");
  });

  it("interval-3 quarterly", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 15),
      intervalUnit: "month",
      intervalValue: 3,
    });
    expect(iso(nextRenewalDate(r, utc(2026, 2, 1)))).toBe("2026-04-15");
    expect(iso(nextRenewalDate(r, utc(2026, 5, 1)))).toBe("2026-07-15");
  });
});

describe("cycleBoundsAt", () => {
  it("returns null before startDate", () => {
    const r = baseRule({ startDate: utc(2026, 3, 1), intervalUnit: "month" });
    expect(cycleBoundsAt(r, utc(2026, 1, 15))).toBe(null);
  });

  it("returns null past endDate", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 3, 1),
    });
    expect(cycleBoundsAt(r, utc(2026, 4, 1))).toBe(null);
  });

  it("monthly day-1 mid-month → [first, last day]", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    const b = cycleBoundsAt(r, utc(2026, 1, 15))!;
    expect(iso(b.start)).toBe("2026-01-01");
    expect(iso(b.end)).toBe("2026-01-31");
  });

  it("monthly day-31 in February → [Jan 31, Feb 27]", () => {
    const r = baseRule({ startDate: utc(2026, 1, 31), intervalUnit: "month" });
    const b = cycleBoundsAt(r, utc(2026, 2, 15))!;
    expect(iso(b.start)).toBe("2026-01-31");
    expect(iso(b.end)).toBe("2026-02-27");
  });

  it("monthly day-31 on Feb 28 → new cycle starts Feb 28", () => {
    const r = baseRule({ startDate: utc(2026, 1, 31), intervalUnit: "month" });
    const b = cycleBoundsAt(r, utc(2026, 2, 28))!;
    expect(iso(b.start)).toBe("2026-02-28");
    expect(iso(b.end)).toBe("2026-03-30");
  });

  it("ref exactly at cycle start", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    const b = cycleBoundsAt(r, utc(2026, 2, 1))!;
    expect(iso(b.start)).toBe("2026-02-01");
    expect(iso(b.end)).toBe("2026-02-28");
  });

  it("clamps cycleEnd to endDate", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 1, 20),
    });
    const b = cycleBoundsAt(r, utc(2026, 1, 10))!;
    expect(iso(b.start)).toBe("2026-01-01");
    expect(iso(b.end)).toBe("2026-01-20");
  });

  it("daily interval=1 → single-day cycles", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "day" });
    const b = cycleBoundsAt(r, utc(2026, 1, 5))!;
    expect(iso(b.start)).toBe("2026-01-05");
    expect(iso(b.end)).toBe("2026-01-05");
  });

  it("biweekly cycles span 14 days", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 5),
      intervalUnit: "week",
      intervalValue: 2,
    });
    const b = cycleBoundsAt(r, utc(2026, 1, 12))!;
    expect(iso(b.start)).toBe("2026-01-05");
    expect(iso(b.end)).toBe("2026-01-18");
  });
});

describe("isPaidThisCycle", () => {
  const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });

  it("false when lastPaid is null", () => {
    expect(isPaidThisCycle(r, null, utc(2026, 1, 15))).toBe(false);
  });

  it("true when lastPaid mid-cycle", () => {
    expect(isPaidThisCycle(r, utc(2026, 1, 5), utc(2026, 1, 15))).toBe(true);
  });

  it("true at cycle start boundary", () => {
    expect(isPaidThisCycle(r, utc(2026, 1, 1), utc(2026, 1, 15))).toBe(true);
  });

  it("true at cycle end boundary", () => {
    expect(isPaidThisCycle(r, utc(2026, 1, 31), utc(2026, 1, 15))).toBe(true);
  });

  it("false when lastPaid is in previous cycle", () => {
    expect(isPaidThisCycle(r, utc(2025, 12, 15), utc(2026, 1, 15))).toBe(false);
  });

  it("false before startDate", () => {
    const future = baseRule({
      startDate: utc(2026, 6, 1),
      intervalUnit: "month",
    });
    expect(isPaidThisCycle(future, utc(2026, 6, 1), utc(2026, 1, 1))).toBe(false);
  });
});

describe("deriveStatus", () => {
  it("inactive short-circuits", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(deriveStatus(r, utc(2026, 1, 15), utc(2026, 1, 20), false)).toBe(
      "inactive",
    );
  });

  it("upcoming when ref is before startDate", () => {
    const r = baseRule({ startDate: utc(2026, 6, 1), intervalUnit: "month" });
    expect(deriveStatus(r, null, utc(2026, 1, 15))).toBe("upcoming");
  });

  it("ended when ref is past endDate", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 3, 1),
    });
    expect(deriveStatus(r, null, utc(2026, 4, 1))).toBe("ended");
  });

  it("paid when lastPaid in current cycle", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(deriveStatus(r, utc(2026, 1, 5), utc(2026, 1, 15))).toBe("paid");
  });

  it("overdue when not paid this cycle", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(deriveStatus(r, utc(2025, 12, 15), utc(2026, 1, 15))).toBe(
      "overdue",
    );
  });
});

describe("renewalsInRange", () => {
  it("monthly day-1 across 6 months", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    const dates = renewalsInRange(r, utc(2026, 1, 1), utc(2026, 6, 30));
    expect(dates.map(iso)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
    ]);
  });

  it("respects window (skips occurrences before start)", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    const dates = renewalsInRange(r, utc(2026, 4, 1), utc(2026, 6, 30));
    expect(dates.map(iso)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01"]);
  });

  it("clamps month-end (Jan 31 → Feb 28, etc.)", () => {
    const r = baseRule({ startDate: utc(2026, 1, 31), intervalUnit: "month" });
    const dates = renewalsInRange(r, utc(2026, 1, 1), utc(2026, 5, 1));
    expect(dates.map(iso)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("respects endDate", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2026, 3, 15),
    });
    const dates = renewalsInRange(r, utc(2026, 1, 1), utc(2026, 6, 1));
    expect(dates.map(iso)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("empty for inverted range", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(renewalsInRange(r, utc(2026, 6, 1), utc(2026, 1, 1))).toEqual([]);
  });
});
