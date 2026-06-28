import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainVariable } from "@/db/repositories/variable";

export type TagInsight = {
  tag: string;
  count: number;
  totalPaise: number;
  /** The category that dominates this tag. Null if the tag is split too
   *  evenly across multiple categories to be meaningful. */
  dominantCategory: { name: string; share: number } | null;
};

/**
 * Group this month's tagged expenses by tag and surface ones used at
 * least twice. Pure function so the parent page can call it ahead of
 * render to decide whether the wrapping collapsible should auto-hide.
 */
export function buildTagInsights(
  items: PlainVariable[],
  categories: PlainCategory[],
  now: Date = new Date(),
): TagInsight[] {
  if (items.length === 0) return [];
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  const inMonth = items.filter((v) => {
    const t = new Date(v.date).getTime();
    return t >= monthStart.getTime() && t <= monthEnd.getTime();
  });
  if (inMonth.length === 0) return [];

  const categoryById = new Map(categories.map((c) => [c.id, c] as const));

  type Bucket = {
    count: number;
    totalPaise: number;
    byCategory: Map<string, number>;
  };
  const tagged = new Map<string, Bucket>();
  for (const v of inMonth) {
    for (const t of v.tags ?? []) {
      let b = tagged.get(t);
      if (!b) {
        b = { count: 0, totalPaise: 0, byCategory: new Map() };
        tagged.set(t, b);
      }
      b.count += 1;
      b.totalPaise += v.amountPaise;
      b.byCategory.set(v.categoryId, (b.byCategory.get(v.categoryId) ?? 0) + 1);
    }
  }

  const result: TagInsight[] = [];
  for (const [tag, b] of tagged) {
    if (b.count < 2) continue;
    let topCatId: string | null = null;
    let topCount = 0;
    for (const [id, n] of b.byCategory) {
      if (n > topCount) {
        topCount = n;
        topCatId = id;
      }
    }
    const share = topCatId ? topCount / b.count : 0;
    const cat = topCatId ? categoryById.get(topCatId) : null;
    result.push({
      tag,
      count: b.count,
      totalPaise: b.totalPaise,
      dominantCategory:
        cat && share >= 0.5
          ? { name: cat.name, share: Math.round(share * 100) }
          : null,
    });
  }
  return result.sort((a, b) => b.count - a.count).slice(0, 6);
}
