"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "pocketbook:density";
const ROOT_CLASS = "density-compact";

export type Density = "cozy" | "compact";

/**
 * UI density preference. "Cozy" is the default — generous padding and
 * comfortable type sizes, suited to scanning. "Compact" tightens cards,
 * list rows, and labels for power users who want to see more at once.
 *
 * Stored in localStorage (per-device preference, no server sync). The
 * hook mirrors the state onto `<html>` as the `density-compact` class so
 * a single CSS rule can adjust components everywhere.
 */
export function useDensity(): {
  density: Density;
  setDensity: (next: Density) => void;
} {
  const [density, setDensityState] = useState<Density>("cozy");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === "compact") setDensityState("compact");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (density === "compact") root.classList.add(ROOT_CLASS);
    else root.classList.remove(ROOT_CLASS);
  }, [density]);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { density, setDensity };
}
