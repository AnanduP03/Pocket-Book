import type { PlainVariable } from "@/db/repositories/variable";

/**
 * Tokenize a note into lowercase words. Splits on whitespace + punctuation.
 * Drops tokens shorter than 2 chars (too noisy: "a", "i", "to") and pure
 * numbers (rarely category-discriminating: "100", "200").
 */
export function tokenizeNote(note: string | null | undefined): string[] {
  if (!note) return [];
  return note
    .toLowerCase()
    .split(/[\s.,;:!?()[\]{}'"+\/\\&|@*#-]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

/**
 * Build a frequency map: token → categoryId → count.
 * Caller passes recent variable expenses; we tokenize their notes and tally.
 */
export function buildCategoryIndex(
  history: Pick<PlainVariable, "categoryId" | "note">[],
): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>();
  for (const v of history) {
    const tokens = tokenizeNote(v.note ?? null);
    if (tokens.length === 0) continue;
    for (const tok of tokens) {
      let perCat = index.get(tok);
      if (!perCat) {
        perCat = new Map();
        index.set(tok, perCat);
      }
      perCat.set(v.categoryId, (perCat.get(v.categoryId) ?? 0) + 1);
    }
  }
  return index;
}

/**
 * Predict a category for a new note based on past usage patterns.
 *
 * Each token in the note contributes votes weighted by its historical
 * category distribution. The category with the highest total weight wins.
 *
 * Returns `null` if there's no signal (empty note, no matching tokens, or
 * the top score is too low to be confident).
 */
export function predictCategory(
  note: string | null | undefined,
  index: Map<string, Map<string, number>>,
  validCategoryIds: Set<string>,
  /** Minimum total weight before we'll commit to a prediction. */
  minScore = 1,
): string | null {
  const tokens = tokenizeNote(note);
  if (tokens.length === 0 || index.size === 0) return null;

  const scores = new Map<string, number>();
  for (const tok of tokens) {
    const perCat = index.get(tok);
    if (!perCat) continue;
    // Total appearances of this token across all categories.
    let totalForToken = 0;
    for (const c of perCat.values()) totalForToken += c;
    if (totalForToken === 0) continue;
    // Each match contributes proportionally to the category that token
    // was historically tagged to. A token that appears in 5 categories
    // contributes less per-category than a token that always pinned to one.
    for (const [catId, count] of perCat) {
      if (!validCategoryIds.has(catId)) continue;
      const weight = count / totalForToken;
      scores.set(catId, (scores.get(catId) ?? 0) + weight);
    }
  }

  if (scores.size === 0) return null;

  let bestCat: string | null = null;
  let bestScore = -1;
  for (const [catId, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCat = catId;
    }
  }
  return bestScore >= minScore ? bestCat : null;
}
