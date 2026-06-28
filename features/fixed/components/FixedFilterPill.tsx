"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/utils";
import type { PlainCategory } from "@/db/repositories/categories";

export type FixedFiltersState = {
  categoryIds: string[];
  text: string;
};

type Props = {
  filters: FixedFiltersState;
  onChange: (next: FixedFiltersState) => void;
  categories: PlainCategory[];
};

export function FixedFilterPill({ filters, onChange, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpenMobile, setSearchOpenMobile] = useState(false);
  const panelId = useId();

  const fixedCats = useMemo(
    () => categories.filter((c) => c.type === "Fixed"),
    [categories],
  );

  const pillLabel =
    filters.categoryIds.length === 0
      ? "All categories"
      : `${filters.categoryIds.length} ${filters.categoryIds.length === 1 ? "category" : "categories"}`;

  const isDefaultState =
    filters.categoryIds.length === 0 && filters.text.length === 0;

  function toggleCategory(id: string) {
    const set = new Set(filters.categoryIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...filters, categoryIds: [...set] });
  }

  function clearAll() {
    onChange({ categoryIds: [], text: "" });
  }

  return (
    <div className="flex flex-col gap-2">
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

        <div className="relative hidden flex-1 sm:block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
          />
          <Input
            id="fixed-filter-text-desktop"
            aria-label="Search fixed expenses"
            placeholder="Search bills…"
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            className="pl-8"
          />
        </div>

        <button
          type="button"
          aria-label={searchOpenMobile ? "Close search" : "Open search"}
          aria-expanded={searchOpenMobile}
          onClick={() => setSearchOpenMobile((o) => !o)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-(--text) sm:hidden"
        >
          <Search aria-hidden className="h-4 w-4" />
        </button>

        {!isDefaultState ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </Button>
        ) : null}
      </div>

      {searchOpenMobile ? (
        <div className="relative sm:hidden">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
          />
          <Input
            id="fixed-filter-text-mobile"
            aria-label="Search fixed expenses"
            placeholder="Search bills…"
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
            {fixedCats.length > 0 ? (
              <div>
                <Label>Categories</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fixedCats.map((c) => {
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
            ) : (
              <p className="text-xs text-(--muted)">
                No Fixed-type categories yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
