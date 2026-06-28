import { describe, expect, it } from "vitest";
import { detectRituals } from "./detect-rituals";
import type { PlainVariable } from "@/db/repositories/variable";

const NOW = new Date("2026-06-16T00:00:00Z");

function v(
  partial: Partial<PlainVariable> & {
    daysAgo: number;
    categoryId: string;
    amountPaise: number;
  },
): PlainVariable {
  const date = new Date(NOW.getTime() - partial.daysAgo * 86_400_000);
  return {
    id: `v-${partial.daysAgo}-${Math.random()}`,
    date,
    amountPaise: partial.amountPaise,
    currency: "INR",
    categoryId: partial.categoryId,
    note: null,
    tags: [],
    createdAt: date,
    updatedAt: date,
  };
}

describe("detectRituals", () => {
  it("returns empty for too few items", () => {
    expect(detectRituals([], NOW)).toEqual([]);
    expect(
      detectRituals(
        [v({ daysAgo: 1, categoryId: "c1", amountPaise: 10000 })],
        NOW,
      ),
    ).toEqual([]);
  });

  it("ignores items outside the 60-day window", () => {
    const items = [
      v({ daysAgo: 100, categoryId: "c1", amountPaise: 10000 }),
      v({ daysAgo: 90, categoryId: "c1", amountPaise: 10000 }),
      v({ daysAgo: 80, categoryId: "c1", amountPaise: 10000 }),
    ];
    expect(detectRituals(items, NOW)).toEqual([]);
  });

  it("detects a weekly coffee ritual", () => {
    const items = [
      v({ daysAgo: 28, categoryId: "coffee", amountPaise: 25000 }),
      v({ daysAgo: 21, categoryId: "coffee", amountPaise: 25000 }),
      v({ daysAgo: 14, categoryId: "coffee", amountPaise: 25000 }),
      v({ daysAgo: 7, categoryId: "coffee", amountPaise: 25000 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals).toHaveLength(1);
    expect(rituals[0]?.categoryId).toBe("coffee");
    expect(rituals[0]?.hits).toBe(4);
    expect(rituals[0]?.intervalDays).toBe(7);
    expect(rituals[0]?.typicalAmountPaise).toBe(25000);
  });

  it("flags an overdue ritual when the next occurrence is past-due", () => {
    // Last seen 21 days ago, with a typical 7-day cadence → way overdue.
    const items = [
      v({ daysAgo: 50, categoryId: "groceries", amountPaise: 200000 }),
      v({ daysAgo: 42, categoryId: "groceries", amountPaise: 200000 }),
      v({ daysAgo: 35, categoryId: "groceries", amountPaise: 200000 }),
      v({ daysAgo: 28, categoryId: "groceries", amountPaise: 200000 }),
      v({ daysAgo: 21, categoryId: "groceries", amountPaise: 200000 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals).toHaveLength(1);
    expect(rituals[0]?.isOverdue).toBe(true);
  });

  it("does not flag a ritual that's still on schedule", () => {
    const items = [
      v({ daysAgo: 21, categoryId: "x", amountPaise: 50000 }),
      v({ daysAgo: 14, categoryId: "x", amountPaise: 50000 }),
      v({ daysAgo: 7, categoryId: "x", amountPaise: 50000 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals[0]?.isOverdue).toBe(false);
  });

  it("clusters amounts within 20% tolerance into one ritual", () => {
    // 100, 110, 95 — all within 20% of each other.
    const items = [
      v({ daysAgo: 21, categoryId: "lunch", amountPaise: 10000 }),
      v({ daysAgo: 14, categoryId: "lunch", amountPaise: 11000 }),
      v({ daysAgo: 7, categoryId: "lunch", amountPaise: 9500 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals).toHaveLength(1);
    expect(rituals[0]?.hits).toBe(3);
  });

  it("splits a category into separate rituals when amounts differ significantly", () => {
    // Two clusters in same category: one ~₹100, one ~₹500.
    const items = [
      v({ daysAgo: 28, categoryId: "food", amountPaise: 10000 }),
      v({ daysAgo: 21, categoryId: "food", amountPaise: 10000 }),
      v({ daysAgo: 14, categoryId: "food", amountPaise: 10000 }),
      v({ daysAgo: 30, categoryId: "food", amountPaise: 50000 }),
      v({ daysAgo: 16, categoryId: "food", amountPaise: 50000 }),
      v({ daysAgo: 2, categoryId: "food", amountPaise: 50000 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals).toHaveLength(2);
    const amounts = rituals.map((r) => r.typicalAmountPaise).sort();
    expect(amounts).toEqual([10000, 50000]);
  });

  it("orders overdue rituals before still-on-schedule ones", () => {
    const items = [
      // Overdue (last seen 21d ago, 7d cadence)
      v({ daysAgo: 35, categoryId: "a", amountPaise: 10000 }),
      v({ daysAgo: 28, categoryId: "a", amountPaise: 10000 }),
      v({ daysAgo: 21, categoryId: "a", amountPaise: 10000 }),
      // On-schedule (last seen 5d ago, 7d cadence)
      v({ daysAgo: 19, categoryId: "b", amountPaise: 30000 }),
      v({ daysAgo: 12, categoryId: "b", amountPaise: 30000 }),
      v({ daysAgo: 5, categoryId: "b", amountPaise: 30000 }),
    ];
    const rituals = detectRituals(items, NOW);
    expect(rituals[0]?.categoryId).toBe("a");
    expect(rituals[1]?.categoryId).toBe("b");
  });
});
