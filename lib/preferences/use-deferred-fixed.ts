"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "pocketbook:deferred";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function storageKey(): string {
  return `${STORAGE_PREFIX}:${currentMonthKey()}`;
}

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * Tracks the set of fixed-expense IDs the user has hypothetically deferred
 * for the current month. The list resets automatically when the month
 * changes (the storage key includes the YYYY-MM slug).
 *
 * "Deferred" never modifies real state — it only adjusts client-side
 * projections so the user can ask "what if I pushed this to next month?"
 * without committing.
 */
export function useDeferredFixed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    write([]);
  }, []);

  return { ids, toggle, clear, isDeferred: (id: string) => ids.includes(id) };
}
