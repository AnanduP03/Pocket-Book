"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/features/shared/components/DatePicker";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/utils";
import {
  daysAgoUtc,
  endOfMonthUtc,
  startOfMonthUtc,
  todayUtc,
} from "@/lib/format/date";
import type { VariableFiltersState } from "./VariableFilters";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  filters: VariableFiltersState;
  onChange: (next: VariableFiltersState) => void;
  categories: PlainCategory[];
};

type Preset = {
  id: "this-month" | "last-30" | "last-90" | "all";
  label: string;
  range: () => { start: Date | null; end: Date | null };
};

const PRESETS: Preset[] = [
  {
    id: "this-month",
    label: "This month",
    range: () => ({ start: startOfMonthUtc(), end: endOfMonthUtc() }),
  },
  {
    id: "last-30",
    label: "Last 30 days",
    range: () => ({ start: daysAgoUtc(30), end: todayUtc() }),
  },
  {
    id: "last-90",
    label: "Last 90 days",
    range: () => ({ start: daysAgoUtc(90), end: todayUtc() }),
  },
  { id: "all", label: "All time", range: () => ({ start: null, end: null }) },
];

function rangesEqual(
  a: { start: Date | null; end: Date | null },
  b: { start: Date | null; end: Date | null },
): boolean {
  return (
    (a.start?.getTime() ?? null) === (b.start?.getTime() ?? null) &&
    (a.end?.getTime() ?? null) === (b.end?.getTime() ?? null)
  );
}

export function VariableFilterPill({ filters, onChange, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpenMobile, setSearchOpenMobile] = useState(false);
  const panelId = useId();

  const variableCats = useMemo(
    () => categories.filter((c) => c.type === "Variable"),
    [categories],
  );

  const activePreset = PRESETS.find((p) =>
    rangesEqual(p.range(), { start: filters.start, end: filters.end }),
  );

  const pillLabel =
    (activePreset?.label ?? "Custom") +
    (filters.categoryIds.length > 0
      ? ` · ${filters.categoryIds.length} ${filters.categoryIds.length === 1 ? "filter" : "filters"}`
      : "");

  // "Clear" only surfaces when the user has actually deviated from the
  // default (this-month preset, no categories, no search). Showing it
  // on first paint reads as if filters were already applied.
  const isDefaultState =
    activePreset?.id === "this-month" &&
    filters.categoryIds.length === 0 &&
    filters.text.length === 0;
  const hasFilters = !isDefaultState;

  function setPreset(p: Preset) {
    const { start, end } = p.range();
    onChange({ ...filters, start, end });
  }

  function toggleCategory(id: string) {
    const set = new Set(filters.categoryIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...filters, categoryIds: [...set] });
  }

  function clearAll() {
    onChange({ start: null, end: null, categoryIds: [], text: "" });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Pill row — pill + (responsive) search */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) setOpen(false);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-sm font-medium text-(--text) transition-colors hover:bg-(--surface-2) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
            open && "bg-(--surface-2)",
          )}
        >
          <span>{pillLabel}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>

        {/* Desktop: always-visible search */}
        <div className="relative hidden flex-1 sm:block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
          />
          <Input
            id="filter-text-desktop"
            aria-label="Search expenses"
            placeholder="Search expenses…"
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            className="pl-8"
          />
        </div>

        {/* Mobile: icon-button that expands inline */}
        <button
          type="button"
          aria-label={searchOpenMobile ? "Close search" : "Open search"}
          aria-expanded={searchOpenMobile}
          onClick={() => setSearchOpenMobile((o) => !o)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-(--text) sm:hidden"
        >
          <Search aria-hidden className="h-4 w-4" />
        </button>

        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </Button>
        ) : null}
      </div>

      {/* Mobile-only expanded search input (full width) */}
      {searchOpenMobile ? (
        <div className="relative sm:hidden">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
          />
          <Input
            id="filter-text-mobile"
            aria-label="Search expenses"
            placeholder="Search expenses…"
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            onBlur={() => {
              if (filters.text.length === 0) setSearchOpenMobile(false);
            }}
            autoFocus
            className="pl-8"
          />
        </div>
      ) : null}

      {/* Expansion panel — same animation pattern as CollapsibleSection */}
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
          <div className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4">
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => {
                const active = activePreset?.id === p.id;
                return (
                  <Button
                    key={p.id}
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreset(p)}
                    aria-pressed={active}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-start">From</Label>
                <DatePicker
                  id="filter-start"
                  value={filters.start}
                  onChange={(d) => onChange({ ...filters, start: d })}
                  {...(filters.end ? { max: filters.end } : {})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-end">To</Label>
                <DatePicker
                  id="filter-end"
                  value={filters.end}
                  onChange={(d) => onChange({ ...filters, end: d })}
                  {...(filters.start ? { min: filters.start } : {})}
                />
              </div>
            </div>

            {variableCats.length > 0 ? (
              <div className="mt-3">
                <Label>Categories</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {variableCats.map((c) => {
                    const selected = filters.categoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors",
                          selected
                            ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                            : "border-(--border) bg-(--surface) text-(--muted) hover:bg-(--surface-2) hover:text-(--text)",
                        )}
                      >
                        <CategoryIcon name={c.icon} color={c.color} size="sm" />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
