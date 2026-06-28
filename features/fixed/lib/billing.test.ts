import { describe, it, expect } from "vitest";
import {
  annualOccurrences,
  cycleBoundsAt,
  deriveStatus,
  isPaidThisCycle,
  isSkippedCycle,
  isSkippedThisCycle,
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

  it("excludes skipped cycles when provided", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    const skipped = [utc(2026, 3, 1), utc(2026, 5, 1)];
    const dates = renewalsInRange(r, utc(2026, 1, 1), utc(2026, 6, 30), skipped);
    expect(dates.map(iso)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-04-01",
      "2026-06-01",
    ]);
  });
});

describe("isSkippedCycle / isSkippedThisCycle", () => {
  const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });

  it("isSkippedCycle false for empty / null", () => {
    expect(isSkippedCycle(null, utc(2026, 1, 1))).toBe(false);
    expect(isSkippedCycle([], utc(2026, 1, 1))).toBe(false);
  });

  it("isSkippedCycle true on exact match (UTC start-of-day)", () => {
    const skipped = [new Date(Date.UTC(2026, 0, 1, 14, 30))];
    expect(isSkippedCycle(skipped, utc(2026, 1, 1))).toBe(true);
  });

  it("isSkippedThisCycle true when ref falls in skipped cycle", () => {
    const skipped = [utc(2026, 2, 1)];
    expect(isSkippedThisCycle(r, skipped, utc(2026, 2, 14))).toBe(true);
  });

  it("isSkippedThisCycle false outside skipped cycle", () => {
    const skipped = [utc(2026, 2, 1)];
    expect(isSkippedThisCycle(r, skipped, utc(2026, 3, 1))).toBe(false);
  });
});

describe("deriveStatus skipped", () => {
  it("returns 'skipped' when current cycle is skipped and not paid", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(
      deriveStatus(r, null, utc(2026, 2, 14), true, [utc(2026, 2, 1)]),
    ).toBe("skipped");
  });

  it("'paid' beats 'skipped' when both apply", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(
      deriveStatus(
        r,
        utc(2026, 2, 5),
        utc(2026, 2, 14),
        true,
        [utc(2026, 2, 1)],
      ),
    ).toBe("paid");
  });
});

describe("annualOccurrences", () => {
  it("monthly interval=1 → 12", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "month" });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(12);
  });
  it("weekly interval=1 → 52", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "week" });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(52);
  });

  it("daily interval=1 → 365", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "day" });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(365);
  });

  it("yearly interval=1 → 1", () => {
    const r = baseRule({ startDate: utc(2026, 1, 1), intervalUnit: "year" });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(1);
  });

  it("monthly interval=3 → 4 (quarterly)", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      intervalValue: 3,
    });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(4);
  });

  it("biweekly → 26", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "week",
      intervalValue: 2,
    });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(26);
  });

  it("returns 0 if endDate already past ref", () => {
    const r = baseRule({
      startDate: utc(2025, 1, 1),
      intervalUnit: "month",
      endDate: utc(2025, 12, 1),
    });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(0);
  });

  it("returns full rate while endDate is still in the future", () => {
    const r = baseRule({
      startDate: utc(2026, 1, 1),
      intervalUnit: "month",
      endDate: utc(2027, 1, 1),
    });
    expect(annualOccurrences(r, utc(2026, 6, 1))).toBe(12);
  });
});

describe("long-running rules", () => {
  // The previous implementation used a SAFETY_LIMIT = 10_000 loop and
  // silently returned null/[] for daily rules whose startDate sat more
  // than ~27 years before the query — these regressions guard the
  // closed-form replacement against re-introducing that bug.
  it("nextRenewalDate handles a daily rule starting 30 years before ref", () => {
    const r = baseRule({ startDate: utc(1990, 1, 1), intervalUnit: "day" });
    expect(iso(nextRenewalDate(r, utc(2026, 6, 18)))).toBe("2026-06-18");
  });

  it("renewalsInRange jumps to window without iterating prior cycles", () => {
    const r = baseRule({ startDate: utc(1990, 1, 1), intervalUnit: "day" });
    const dates = renewalsInRange(r, utc(2026, 6, 1), utc(2026, 6, 5));
    expect(dates.map(iso)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });

  it("cycleBoundsAt resolves a daily rule decades after start", () => {
    const r = baseRule({ startDate: utc(1990, 1, 1), intervalUnit: "day" });
    const b = cycleBoundsAt(r, utc(2026, 6, 18))!;
    expect(iso(b.start)).toBe("2026-06-18");
    expect(iso(b.end)).toBe("2026-06-18");
  });
});
