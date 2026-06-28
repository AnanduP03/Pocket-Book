"use client";

import { useEffect, useState } from "react";

type LegacyNavigator = Navigator & { standalone?: boolean };

/**
 * Returns true when the app is running as an installed PWA — either via the
 * standard `display-mode: standalone` media query, or iOS Safari's legacy
 * `navigator.standalone` flag. SSR returns `false` so install hints stay
 * hidden on first paint and only appear after we know we're not standalone.
 */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(display-mode: standalone)");
    const compute = () =>
      mql.matches || (navigator as LegacyNavigator).standalone === true;

    setStandalone(compute());
    const onChange = () => setStandalone(compute());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return standalone;
}
