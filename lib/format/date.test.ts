import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  todayUtc,
  startOfMonthUtc,
  endOfMonthUtc,
  utcMidnight,
} from "./date";

describe("todayUtc", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns UTC-midnight on the current UTC calendar date", () => {
    // 2026-06-22 23:30:00 UTC. In any TZ east of UTC the LOCAL date is the
    // 23rd at this instant — the buggy implementation (using local-time
    // getters) would return 2026-06-23 there. The contract is "UTC date".
    vi.setSystemTime(new Date("2026-06-22T23:30:00.000Z"));

    const result = todayUtc();

    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5);
    expect(result.getUTCDate()).toBe(22);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("matches utcMidnight(new Date()) for any wall-clock time", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
    expect(todayUtc().toISOString()).toBe(
      utcMidnight(new Date()).toISOString(),
    );

    vi.setSystemTime(new Date("2026-12-31T23:59:59.999Z"));
    expect(todayUtc().toISOString()).toBe(
      utcMidnight(new Date()).toISOString(),
    );
  });
});

describe("startOfMonthUtc / endOfMonthUtc", () => {
  it("startOfMonthUtc returns 1st of the month at UTC midnight", () => {
    const ref = new Date("2026-06-15T18:30:00.000Z");
    expect(startOfMonthUtc(ref).toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("endOfMonthUtc returns the last day of the month at UTC midnight", () => {
    const ref = new Date("2026-06-15T18:30:00.000Z");
    expect(endOfMonthUtc(ref).toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("endOfMonthUtc handles February in a leap year", () => {
    expect(
      endOfMonthUtc(new Date("2024-02-10T00:00:00.000Z")).toISOString(),
    ).toBe("2024-02-29T00:00:00.000Z");
  });

  it("endOfMonthUtc handles February in a non-leap year", () => {
    expect(
      endOfMonthUtc(new Date("2026-02-10T00:00:00.000Z")).toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z");
  });
});
