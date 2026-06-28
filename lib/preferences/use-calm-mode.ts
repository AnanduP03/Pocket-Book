"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "pocketbook:calm-mode";
const ROOT_CLASS = "calm-amounts";

/**
 * Calm mode is a UX safety valve: when on, the app blurs all currency
 * amounts so the user can scan their dashboard for *status* without
 * dwelling on exact rupees. Useful on tight months or when revisiting
 * the app after a stressful weekend.
 *
 * State lives in localStorage (no server round-trip — it's a UI
 * preference, not a profile setting). The hook also toggles a class on
 * `<html>` so any `.pb-amount` element across the app blurs in unison
 * via a single CSS rule.
 */
export function useCalmMode(): {
  calm: boolean;
  toggle: () => void;
  setCalm: (next: boolean) => void;
} {
  const [calm, setCalmState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === "1") setCalmState(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Mirror state to <html> class so CSS can target globally.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (calm) root.classList.add(ROOT_CLASS);
    else root.classList.remove(ROOT_CLASS);
  }, [calm]);

  const setCalm = useCallback((next: boolean) => {
    setCalmState(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCalmState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { calm, toggle, setCalm };
}
