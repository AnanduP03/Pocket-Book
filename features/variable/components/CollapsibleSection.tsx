"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Optional small text shown in muted style next to the title — used
   *  for affordances like "3 patterns" or "1 export". Auto-truncates. */
  trailing?: string;
  defaultOpen?: boolean;
  /** When true, the section renders nothing. Used by callers whose
   *  collapsibles auto-hide if their content is empty. */
  hidden?: boolean;
  children: ReactNode;
};

/**
 * Generic disclosure used by the /variable secondary sections
 * (Patterns / Usuals / Tools). Heading wraps the trigger so screen
 * readers announce both the section name and its expanded state.
 *
 * Animation: grid-template-rows transitions between 0fr and 1fr;
 * the inner wrapper uses overflow:hidden so collapsed content has
 * zero height. Respects prefers-reduced-motion.
 */
export function CollapsibleSection({
  title,
  trailing,
  defaultOpen = false,
  hidden = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  if (hidden) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface)">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-semibold text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-90",
            )}
          />
          <span className="flex-1">{title}</span>
          {trailing ? (
            <span className="truncate text-[11px] font-normal text-(--muted)">
              {trailing}
            </span>
          ) : null}
        </button>
      </h2>
      <div
        id={panelId}
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 200ms ease",
        }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
