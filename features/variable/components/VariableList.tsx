"use client";

import { useMemo, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { groupByDay } from "../lib/group-by-day";
import type { PlainVariable } from "@/db/repositories/variable";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  items: PlainVariable[];
  categories: PlainCategory[];
  locale: string;
  onEdit: (e: PlainVariable) => void;
  onDelete: (e: PlainVariable) => void;
  emptyMessage?: string;
  /** When set, the row gets checkbox treatment and clicks toggle selection
   *  instead of opening edit/delete. */
  selectMode?: boolean;
  selectedIds?: Set<string>;
  /** Called when the user long-presses a row outside select mode — used
   *  to enter select mode on touch. Click-toggle is handled via onSelectToggle. */
  onLongPress?: (e: PlainVariable) => void;
  onSelectToggle?: (e: PlainVariable) => void;
};

const LONG_PRESS_MS = 450;

export function VariableList({
  items,
  categories,
  locale,
  onEdit,
  onDelete,
  emptyMessage,
  selectMode = false,
  selectedIds,
  onLongPress,
  onSelectToggle,
}: Props) {
  const categoryById = useMemo(() => {
    const m = new Map<string, PlainCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const groups = useMemo(() => groupByDay(items, locale), [items, locale]);

  // Long-press detection: pointerdown starts a timer; pointerup/cancel
  // clears it; if the timer fires first, treat it as a long-press.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = (e: PlainVariable) => {
    if (selectMode || !onLongPress) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(e);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">
          {emptyMessage ??
            "Nothing logged yet. Tap + and your day starts paying attention."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.dateKey} aria-labelledby={`day-${g.dateKey}`}>
          <h2
            id={`day-${g.dateKey}`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted)"
          >
            {g.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {g.items.map((e) => {
              const c = categoryById.get(e.categoryId);
              const selected = selectedIds?.has(e.id) ?? false;
              const onRowClick = selectMode
                ? () => onSelectToggle?.(e)
                : undefined;
              return (
                <li
                  key={e.id}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-card)] border bg-(--surface) p-4 transition-colors",
                    selected
                      ? "border-(--accent) bg-(--accent)/15"
                      : "border-(--border)",
                    selectMode && "cursor-pointer",
                  )}
                  onClick={onRowClick}
                  onPointerDown={() => startLongPress(e)}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                >
                  {selectMode ? (
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-(--accent) bg-(--accent)/40"
                          : "border-(--border)",
                      )}
                    >
                      {selected ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-(--text)" />
                      ) : null}
                    </span>
                  ) : c ? (
                    <CategoryIcon name={c.icon} color={c.color} size="md" />
                  ) : (
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2) text-xs text-(--muted)"
                      aria-hidden
                    >
                      ?
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-(--text)">
                        {c?.name ?? "Unknown"}
                      </p>
                      <p className="shrink-0 tabular-nums text-sm font-semibold text-(--text)">
                        {formatCurrency(e.amountPaise, e.currency)}
                      </p>
                    </div>
                    {e.note ? (
                      <p className="mt-0.5 truncate text-xs text-(--muted)">
                        {e.note}
                      </p>
                    ) : null}
                    {e.tags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-(--surface-2) px-1.5 py-0.5 text-[10px] text-(--muted)"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!selectMode ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit expense ${formatCurrency(e.amountPaise, e.currency)}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onEdit(e);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete expense"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDelete(e);
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
