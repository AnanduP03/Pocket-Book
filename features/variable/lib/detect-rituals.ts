import type { PlainVariable } from "@/db/repositories/variable";

export type Ritual = {
  /** A stable client-side key built from category + amount bucket. */
  key: string;
  categoryId: string;
  /** Mean of all amounts in the cluster. */
  typicalAmountPaise: number;
  /** How many recent occurrences this ritual is built from. */
  hits: number;
  /** Mean gap between successive occurrences, in days. */
  intervalDays: number;
  /** ISO date of the most recent matching expense. */
  lastSeenIso: string;
  /** ISO date of the next predicted occurrence (lastSeen + interval). */
  expectedNextIso: string;
  /** True when expectedNext is more than half-an-interval in the past. */
  isOverdue: boolean;
};

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 60;
const MIN_HITS = 3;
/** Two amounts are bucketed together when within ±20% of each other. */
const AMOUNT_TOLERANCE = 0.2;

function amountBucket(paise: number): number {
  // Round to nearest 50 paise to merge minor variation into a single bucket
  // before the tolerance pass. Coarse but stable.
  if (paise <= 0) return 0;
  return Math.round(paise / 5_000) * 5_000;
}

function withinTolerance(a: number, b: number): boolean {
  if (a === 0 || b === 0) return a === b;
  const ratio = Math.abs(a - b) / Math.max(a, b);
  return ratio <= AMOUNT_TOLERANCE;
}

/**
 * Cluster recent variable expenses into "rituals" — recurring patterns
 * the user has built without setting up a fixed expense. We look at the
 * last `WINDOW_DAYS` days and group by (categoryId, amount-bucket); a
 * ritual surfaces when the same cluster has fired ≥ MIN_HITS times.
 *
 * Pure function. Test-friendly.
 */
export function detectRituals(
  items: PlainVariable[],
  now: Date = new Date(),
): Ritual[] {
  if (items.length === 0) return [];
  const cutoff = now.getTime() - WINDOW_DAYS * DAY_MS;
  const recent = items.filter((v) => new Date(v.date).getTime() >= cutoff);
  if (recent.length < MIN_HITS) return [];

  // Group by categoryId, then sub-cluster by amount tolerance.
  const byCategory = new Map<string, PlainVariable[]>();
  for (const v of recent) {
    const arr = byCategory.get(v.categoryId);
    if (arr) arr.push(v);
    else byCategory.set(v.categoryId, [v]);
  }

  const rituals: Ritual[] = [];
  for (const [categoryId, entries] of byCategory) {
    if (entries.length < MIN_HITS) continue;

    // Sort entries by amount-bucket so neighbours are clustered together.
    const sorted = [...entries].sort(
      (a, b) => amountBucket(a.amountPaise) - amountBucket(b.amountPaise),
    );

    // Walk the sorted list and split into runs where successive amounts
    // stay within tolerance of the running mean.
    let runStart = 0;
    for (let i = 1; i <= sorted.length; i++) {
      const ended = i === sorted.length;
      const prev = sorted[i - 1]!.amountPaise;
      const curr = ended ? null : sorted[i]!.amountPaise;
      if (ended || (curr !== null && !withinTolerance(prev, curr))) {
        const cluster = sorted.slice(runStart, i);
        if (cluster.length >= MIN_HITS) {
          const ritual = ritualFromCluster(categoryId, cluster, now);
          if (ritual) rituals.push(ritual);
        }
        runStart = i;
      }
    }
  }

  // Most overdue first, then most-frequent.
  rituals.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return b.hits - a.hits;
  });
  return rituals;
}

function ritualFromCluster(
  categoryId: string,
  cluster: PlainVariable[],
  now: Date,
): Ritual | null {
  if (cluster.length < MIN_HITS) return null;

  const byDate = [...cluster].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const gapsMs: number[] = [];
  for (let i = 1; i < byDate.length; i++) {
    const gap =
      new Date(byDate[i]!.date).getTime() -
      new Date(byDate[i - 1]!.date).getTime();
    if (gap > 0) gapsMs.push(gap);
  }
  if (gapsMs.length === 0) return null;

  const meanGapMs = gapsMs.reduce((s, g) => s + g, 0) / gapsMs.length;
  const intervalDays = Math.max(1, Math.round(meanGapMs / DAY_MS));

  const totalPaise = byDate.reduce((s, v) => s + v.amountPaise, 0);
  const typicalAmountPaise = Math.round(totalPaise / byDate.length);

  const last = byDate[byDate.length - 1]!;
  const lastSeenMs = new Date(last.date).getTime();
  const expectedNextMs = lastSeenMs + meanGapMs;
  const isOverdue = now.getTime() - expectedNextMs > meanGapMs * 0.5;

  return {
    key: `${categoryId}:${amountBucket(typicalAmountPaise)}`,
    categoryId,
    typicalAmountPaise,
    hits: byDate.length,
    intervalDays,
    lastSeenIso: new Date(lastSeenMs).toISOString(),
    expectedNextIso: new Date(expectedNextMs).toISOString(),
    isOverdue,
  };
}
