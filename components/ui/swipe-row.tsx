"use client";

import { type ReactNode } from "react";
import { useSwipeActions } from "@/lib/ui/use-swipe-actions";
import { cn } from "@/lib/utils";

type ActionVisual = {
  label: string;
  icon: ReactNode;
  /** Tailwind class for the bg color of the action backdrop. */
  bgClass: string;
};

type Props = {
  children: ReactNode;
  className?: string;
  rightAction?: { visual: ActionVisual; run: () => void } | null;
  leftAction?: { visual: ActionVisual; run: () => void } | null;
  /** Disable swipe entirely (e.g. while a row is busy / inactive). */
  disabled?: boolean;
};

/**
 * Wraps a list row with iOS Mail-style swipe-to-action behavior.
 *
 *   - swipe right → reveals `rightAction` backdrop, runs `rightAction.run`
 *     when released past threshold
 *   - swipe left  → same with `leftAction`
 *
 * The action backdrops sit behind the row's content; the content
 * translates over them as the user drags. The pointer-events of the
 * backdrops stay off until they're under the finger so a tap on a row
 * still goes through cleanly.
 *
 * Touch only — desktop pointers fall through, so click/keyboard
 * affordances on the row remain the primary path.
 */
export function SwipeRow({
  children,
  className,
  rightAction,
  leftAction,
  disabled,
}: Props) {
  const { handlers, state } = useSwipeActions({
    onSwipeRight: rightAction ? rightAction.run : null,
    onSwipeLeft: leftAction ? leftAction.run : null,
    enabled: !disabled,
  });

  const tx = state.translateX;
  const showRight = tx > 0;
  const showLeft = tx < 0;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Right-action backdrop (revealed on swipe-right) */}
      {rightAction ? (
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 flex w-full items-center justify-start px-4 text-(--accent-fg)",
            rightAction.visual.bgClass,
            showRight ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {rightAction.visual.icon}
            {rightAction.visual.label}
          </span>
        </div>
      ) : null}

      {/* Left-action backdrop (revealed on swipe-left) */}
      {leftAction ? (
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 right-0 flex w-full items-center justify-end px-4 text-(--accent-fg)",
            leftAction.visual.bgClass,
            showLeft ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {leftAction.visual.label}
            {leftAction.visual.icon}
          </span>
        </div>
      ) : null}

      {/* Row content with translate-X driven by swipe state. */}
      <div
        {...handlers}
        style={{
          transform: `translateX(${tx}px)`,
          transition: state.active
            ? "none"
            : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)",
          touchAction: "pan-y",
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
