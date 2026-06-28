"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

type Props = {
  term: string;
  description: string;
  /** When true, the trigger sits inline next to text. When false, it's
   *  block-level — useful for card headers. */
  inline?: boolean;
};

/**
 * Inline glossary tooltip. Renders a tiny (i) button next to a term
 * (rendered by the parent). Tap or hover reveals a short definition.
 * Auto-dismisses on outside click or Escape.
 *
 * Use this for jargon that the rest of the UI assumes — "free cash",
 * "burn rate", "sweep" — so a first-time visitor isn't lost without
 * asking a friend what each term means.
 */
export function GlossaryTip({ term, description, inline = true }: Props) {
  const [open, setOpen] = useState(false);
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

  return (
    <span
      ref={wrapperRef}
      className={inline ? "relative inline-flex" : "relative"}
    >
      <button
        type="button"
        aria-label={`What is ${term}?`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-(--muted) hover:text-(--text)"
      >
        <Info className="h-3 w-3" aria-hidden />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-1 w-56 rounded-[var(--radius-input)] border border-(--border) bg-(--surface) p-2.5 text-[11px] leading-snug text-(--text) shadow-(--shadow-sheet)"
        >
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-(--muted)">
            {term}
          </span>
          <span className="mt-1 block">{description}</span>
        </span>
      ) : null}
    </span>
  );
}
