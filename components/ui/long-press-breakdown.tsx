"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** The visible amount the user can long-press. */
  children: ReactNode;
  /** Lines to display in the popover. Each line: optional label, value
   *  string, and optional sign tint (for positive/negative deltas). */
  lines: { label: string; value: string; tone?: "default" | "muted" }[];
  /** Compact title for the popover header. */
  title: string;
  /** ms before long-press fires. */
  threshold?: number;
};

/**
 * Wraps a label and reveals a small popover explaining its computation
 * on long-press (touch hold ≥ 600 ms) or right-click. Used to demystify
 * the dashboard hero amounts without crowding the default view.
 *
 * Educational: the popover shows the line-items that produced the
 * number — e.g. Income − Fixed − Variable = Free cash. Tap outside or
 * release to dismiss.
 */
export function LongPressBreakdown({
  children,
  lines,
  title,
  threshold = 600,
}: Props) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (target && wrapperRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const start = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), threshold);
  };
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onContextMenu={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
    >
      {children}
      {open ? (
        <span
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-full z-40 mt-2 min-w-[16rem] max-w-[20rem] rounded-[var(--radius-input)] border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sheet)"
        >
          <span className="block text-[10px] uppercase tracking-[0.18em] text-(--muted)">
            {title}
          </span>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs">
            {lines.map((l, i) => (
              <li
                key={i}
                className={`flex items-baseline justify-between gap-3 tabular-nums ${
                  l.tone === "muted" ? "text-(--muted)" : "text-(--text)"
                }`}
              >
                <span>{l.label}</span>
                <span className="font-medium">{l.value}</span>
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}
