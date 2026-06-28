"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  onRefresh: () => Promise<void> | void;
  /** Pixels of pull required to trigger refresh on release. */
  threshold?: number;
  /** Disable the hook entirely (e.g. desktop). */
  enabled?: boolean;
};

type State = {
  /** 0..1+ — fraction of threshold pulled. */
  progress: number;
  /** Raw pixels currently pulled (after damping). */
  pullDistance: number;
  /** True while the refresh callback is running. */
  refreshing: boolean;
};

/**
 * iOS-style pull-to-refresh. Only activates when the page is scrolled to
 * the very top, only on touch devices. Damps the pull distance so it
 * feels rubber-band-y without fighting iOS's own rubber-band.
 *
 * Usage: pair with `<PullToRefreshIndicator />` rendering the returned
 * `progress`/`refreshing` to show feedback.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: Options): State {
  const [progress, setProgress] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs so the touch handlers see the latest values without re-binding.
  const startY = useRef(0);
  const isPulling = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    function setDistance(v: number) {
      distanceRef.current = v;
      setPullDistance(v);
      setProgress(Math.min(1, v / threshold));
    }

    function handleStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      // Bail if a sheet, dialog, or dropdown menu is open. Without this,
      // dragging down inside an open sheet at scrollY=0 fires a refresh
      // and tears down the route the user was operating in.
      if (document.querySelector('[data-state="open"][role="dialog"]')) return;
      if (document.querySelector('[data-state="open"][role="menu"]')) return;
      const t = e.touches[0];
      if (!t) return;
      startY.current = t.clientY;
      isPulling.current = true;
    }

    function handleMove(e: TouchEvent) {
      if (!isPulling.current) return;
      if (window.scrollY > 0) {
        // The user scrolled up while pulling — abandon the pull.
        isPulling.current = false;
        setDistance(0);
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;
      if (dy <= 0) {
        setDistance(0);
        return;
      }
      // Damped rubber-band: linear up to threshold, then half speed.
      const damped =
        dy < threshold ? dy : threshold + (dy - threshold) * 0.5;
      setDistance(Math.min(damped, threshold * 1.6));
    }

    async function handleEnd() {
      if (!isPulling.current) return;
      isPulling.current = false;
      const distance = distanceRef.current;
      if (distance >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        // Snap to threshold while spinner runs.
        setDistance(threshold);
        try {
          await onRefreshRef.current();
        } catch {
          // swallow — onError handlers in the refresh fn surface their own toasts
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
    }

    document.addEventListener("touchstart", handleStart, { passive: true });
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);
    return () => {
      document.removeEventListener("touchstart", handleStart);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
    };
  }, [enabled, threshold]);

  return { progress, pullDistance, refreshing };
}
