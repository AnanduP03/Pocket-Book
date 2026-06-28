"use client";

import { useCallback, useEffect, useState } from "react";

const RECENT_KEY = "pocketbook:recent-variable-categories";
const MAX = 10;

/**
 * Tracks the most-recently-used variable category IDs in localStorage so
 * the picker can surface "your usual" first. Pure client state — there's
 * no value in syncing this across devices, and writing it locally avoids
 * a server round-trip on every quick log.
 *
 * Usage:
 *   const { recent, recordUse } = useRecentCategories();
 *   // After a successful log: recordUse(categoryId);
 *   // To order picker: sort categories by recent.indexOf(c.id) ascending,
 *   //   falling back to original index for unseen categories.
 */
export function useRecentCategories(): {
  recent: string[];
  recordUse: (categoryId: string) => void;
} {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const recordUse = useCallback((categoryId: string) => {
    setRecent((prev) => {
      const next = [categoryId, ...prev.filter((id) => id !== categoryId)].slice(
        0,
        MAX,
      );
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { recent, recordUse };
}

/**
 * Sort categories so the recently-used ones come first, original order
 * preserved for the rest. Pure helper, easy to test.
 */
export function rankByRecent<T extends { id: string }>(
  categories: T[],
  recent: string[],
): T[] {
  if (recent.length === 0) return categories;
  const recentIndex = new Map<string, number>();
  recent.forEach((id, i) => recentIndex.set(id, i));
  return [...categories].sort((a, b) => {
    const ai = recentIndex.has(a.id)
      ? recentIndex.get(a.id)!
      : Number.POSITIVE_INFINITY;
    const bi = recentIndex.has(b.id)
      ? recentIndex.get(b.id)!
      : Number.POSITIVE_INFINITY;
    if (ai === bi) return 0;
    return ai - bi;
  });
}
