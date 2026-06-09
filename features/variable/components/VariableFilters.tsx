"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/features/shared/components/DatePicker";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/utils";
import {
  daysAgoUtc,
  endOfMonthUtc,
  startOfMonthUtc,
  todayUtc,
} from "@/lib/format/date";
import type { PlainCategory } from "@/db/repositories/categories";

export type VariableFiltersState = {
  start: Date | null;
  end: Date | null;
  categoryIds: string[];
  text: string;
};

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

export function VariableFilters({ filters, onChange, categories }: Props) {
  const activeCategories = useMemo(
    () => categories.filter((c) => c.type === "Variable"),
    [categories],
  );

  const activePreset = PRESETS.find((p) =>
    rangesEqual(p.range(), { start: filters.start, end: filters.end }),
  );

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

  const hasFilters =
    filters.start ||
    filters.end ||
    filters.categoryIds.length > 0 ||
    filters.text.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4">
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
        <div className="ml-auto" />
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-text">Search note</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
            />
            <Input
              id="filter-text"
              placeholder="Find by text"
              value={filters.text}
              onChange={(e) => onChange({ ...filters, text: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {activeCategories.length > 0 ? (
        <div>
          <Label>Categories</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeCategories.map((c) => {
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
  );
}
