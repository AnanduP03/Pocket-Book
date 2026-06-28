"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  /** Callback fires when the row is released past `threshold` rightward. */
  onSwipeRight?: (() => void) | null;
  /** Callback fires when released past `threshold` leftward. */
  onSwipeLeft?: (() => void) | null;
  /** Pixels of horizontal travel needed to trigger an action. Default 80. */
  threshold?: number;
  /** Disable detection entirely (e.g. desktop, or row in disabled state). */
  enabled?: boolean;
};

type State = {
  /** Current horizontal offset in px (positive = right, negative = left). */
  translateX: number;
  /** True while the user's finger is still down on this row. */
  active: boolean;
  /** True while a snap-back animation is settling. */
  settling: boolean;
};

/**
 * Per-row swipe gesture for list-style UIs (Apple Mail pattern).
 *
 * The hook returns touch handlers to spread on the row's content layer
 * plus the current state for rendering visual feedback (action labels
 * behind the row, follow-the-finger translate).
 *
 * Direction is locked in on the first significant move:
 *   - if dy >= dx, treat as a vertical scroll and let the page handle it
 *   - otherwise capture as a horizontal swipe
 *
 * Once a swipe captures, the page's scroll is preserved (we don't call
 * preventDefault — keeping the listener passive — so vertical drag still
 * works after a small horizontal nudge).
 */
export function useSwipeActions({
  onSwipeRight,
  onSwipeLeft,
  threshold = 80,
  enabled = true,
}: Options): {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
  state: State;
} {
  const [translateX, setTranslateX] = useState(0);
  const [active, setActive] = useState(false);
  const [settling, setSettling] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const horizontal = useRef<null | boolean>(null);

  const reset = useCallback(() => {
    setSettling(true);
    setTranslateX(0);
    setActive(false);
    horizontal.current = null;
    // Match the CSS spring duration so layout doesn't flash.
    window.setTimeout(() => setSettling(false), 220);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      startX.current = t.clientX;
      startY.current = t.clientY;
      horizontal.current = null;
      setActive(true);
      setSettling(false);
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !active) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      // Lock axis on first non-trivial move.
      if (horizontal.current == null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        horizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      if (!horizontal.current) return;

      // Disable directions without a callback so the row doesn't slide
      // into empty space.
      const blocked =
        (dx > 0 && !onSwipeRight) || (dx < 0 && !onSwipeLeft);
      if (blocked) {
        // Soft resistance — let it move a little so the user feels the
        // edge but can't reach the threshold.
        setTranslateX(Math.sign(dx) * Math.min(Math.abs(dx) * 0.25, 24));
        return;
      }
      // Light damping past threshold to keep the row from flying off.
      const capped =
        Math.abs(dx) <= threshold
          ? dx
          : Math.sign(dx) * (threshold + (Math.abs(dx) - threshold) * 0.5);
      setTranslateX(capped);
    },
    [enabled, active, threshold, onSwipeLeft, onSwipeRight],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (!active || !horizontal.current) {
      reset();
      return;
    }
    if (translateX >= threshold && onSwipeRight) {
      onSwipeRight();
    } else if (translateX <= -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    reset();
  }, [enabled, active, translateX, threshold, onSwipeLeft, onSwipeRight, reset]);

  const onTouchCancel = useCallback(() => reset(), [reset]);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    state: { translateX, active, settling },
  };
}
