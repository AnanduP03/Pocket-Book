"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Delete, Zap } from "lucide-react";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { createVariableAction } from "../actions";
import {
  rankByRecent,
  useRecentCategories,
} from "../lib/use-recent-categories";
import { todayUtc } from "@/lib/format/date";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainQuickPreset } from "@/db/repositories/settings";

const LAST_CATEGORY_KEY = "pocketbook:last-variable-category";

type Props = {
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
  presets?: PlainQuickPreset[];
  /** Called after a successful log (sheet should close on this signal). */
  onLogged: () => void;
};

const ROW_KEYS: Array<number | "00" | "back"> = [
  1, 2, 3,
  4, 5, 6,
  7, 8, 9,
  "00", 0, "back",
];

/**
 * Mobile-first numpad-driven quick-log. Replaces the keyboard form behind the
 * global FAB on phone-sized viewports.
 *
 * State:
 *   - amount stored as whole rupees; paise = rupees × 100. (Variable expenses
 *     in INR rarely need sub-rupee precision; if a user truly does, they can
 *     fall back to the form on /variable.)
 *
 * Layout (top to bottom): big amount display · top-3 category chips with
 * "More" expander · 4×3 numpad · primary "Log expense" button. Designed so
 * the user's thumb never travels far from the bottom of the sheet.
 */
export function NumpadQuickLog({
  categories,
  defaultCurrency,
  defaultLocale,
  presets,
  onLogged,
}: Props) {
  const queryClient = useQueryClient();
  const { recent, recordUse } = useRecentCategories();
  const variableCats = useMemo(
    () => categories.filter((c) => c.type === "Variable"),
    [categories],
  );
  // Rank by recent usage; the user's "usuals" come first.
  const rankedCats = useMemo(
    () => rankByRecent(variableCats, recent),
    [variableCats, recent],
  );
  const top3 = useMemo(() => rankedCats.slice(0, 3), [rankedCats]);
  const validPresets = useMemo(() => {
    if (!presets || presets.length === 0) return [];
    const variableIds = new Set(variableCats.map((c) => c.id));
    return presets.filter(
      (p) => p.amountPaise > 0 && p.label.length > 0 && variableIds.has(p.categoryId),
    );
  }, [presets, variableCats]);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const [rupees, setRupees] = useState(0);
  const amountPaise = rupees * 100;

  const [categoryId, setCategoryId] = useState<string>("");
  const [showAll, setShowAll] = useState(false);

  // Restore last-used category on mount; fall back to first category.
  useEffect(() => {
    if (variableCats.length === 0) return;
    let next = variableCats[0]?.id ?? "";
    try {
      const saved = window.localStorage.getItem(LAST_CATEGORY_KEY);
      if (saved && variableCats.some((c) => c.id === saved)) next = saved;
    } catch {
      /* localStorage unavailable */
    }
    setCategoryId(next);
  }, [variableCats]);

  const rupeeFormatter = useMemo(
    () => new Intl.NumberFormat(defaultLocale),
    [defaultLocale],
  );

  function pressKey(k: number | "00" | "back") {
    if (k === "back") {
      setRupees((r) => Math.floor(r / 10));
      return;
    }
    if (k === "00") {
      setRupees((r) => Math.min(r * 100, 99_999_999));
      return;
    }
    setRupees((r) => Math.min(r * 10 + k, 99_999_999));
  }

  const mutation = useMutation({
    mutationFn: (input: { amountPaise: number; categoryId: string }) =>
      createVariableAction({
        date: todayUtc(),
        amountPaise: input.amountPaise,
        currency: defaultCurrency,
        categoryId: input.categoryId,
        note: null,
      }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onSuccess: (res, vars) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      const cat = variableCats.find((c) => c.id === vars.categoryId);
      toast.success(`Logged${cat ? ` · ${cat.name}` : ""}`);
      try {
        window.localStorage.setItem(LAST_CATEGORY_KEY, vars.categoryId);
      } catch {
        /* ignore */
      }
      recordUse(vars.categoryId);
      setRupees(0);
      onLogged();
    },
    onError: () => toast.error("Couldn't log expense — try again"),
  });

  function submit() {
    if (rupees <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    mutation.mutate({ amountPaise, categoryId });
  }

  function logPreset(p: PlainQuickPreset) {
    mutation.mutate({
      amountPaise: p.amountPaise,
      categoryId: p.categoryId,
    });
  }

  if (variableCats.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-4 text-sm text-(--muted)">
        Add a Variable category first to start quick-logging expenses.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-center gap-2 py-2 text-(--text)">
        <span className="font-display text-3xl text-(--muted)">₹</span>
        <span className="font-display text-5xl tabular-nums tracking-tight">
          {rupeeFormatter.format(rupees)}
        </span>
      </div>

      {validPresets.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-(--muted)">
            <Zap className="h-3 w-3 text-(--accent)" aria-hidden /> Quick log
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {validPresets.map((p) => {
              const cat = categoryById.get(p.categoryId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => logPreset(p)}
                  disabled={mutation.isPending}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-(--border) bg-(--surface-2)/60 px-3 py-2 text-sm font-medium text-(--text) transition-transform active:scale-[0.97] disabled:opacity-50"
                >
                  {cat ? (
                    <CategoryIcon name={cat.icon} color={cat.color} size="sm" />
                  ) : null}
                  <span>{p.label}</span>
                  <span className="tabular-nums text-(--muted)">
                    {formatCurrency(p.amountPaise, defaultCurrency, defaultLocale)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!showAll ? (
        <div
          role="radiogroup"
          aria-label="Category"
          className="flex flex-wrap gap-1.5"
        >
          {top3.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors active:scale-[0.97]",
                  active
                    ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                    : "border-(--border) bg-(--surface-2)/40 text-(--muted)",
                )}
              >
                <CategoryIcon name={c.icon} color={c.color} size="sm" />
                {c.name}
              </button>
            );
          })}
          {variableCats.length > top3.length ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-dashed border-(--border) px-3 text-sm text-(--muted) transition-colors active:scale-[0.97]"
            >
              More →
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
              All categories
            </span>
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs text-(--muted) underline-offset-2 hover:underline"
            >
              Show fewer
            </button>
          </div>
          <div className="grid max-h-[180px] grid-cols-3 gap-2 overflow-y-auto">
            {rankedCats.map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setShowAll(false);
                  }}
                  className={cn(
                    "flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-input)] border px-2 text-xs font-medium transition-colors active:scale-[0.97]",
                    active
                      ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                      : "border-(--border) bg-(--surface-2)/40 text-(--muted)",
                  )}
                >
                  <CategoryIcon name={c.icon} color={c.color} size="sm" />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2" aria-label="Numpad">
        {ROW_KEYS.map((k) => {
          if (k === "back") {
            return (
              <button
                key="back"
                type="button"
                onClick={() => pressKey("back")}
                aria-label="Backspace"
                className="flex h-14 items-center justify-center rounded-[var(--radius-input)] bg-(--surface-2)/60 text-(--muted) transition-colors active:scale-[0.97] active:bg-(--surface-2)"
              >
                <Delete className="h-5 w-5" aria-hidden />
              </button>
            );
          }
          return (
            <button
              key={k}
              type="button"
              onClick={() => pressKey(k)}
              className={cn(
                "h-14 rounded-[var(--radius-input)] bg-(--surface-2)/60 font-display text-(--text) tabular-nums transition-colors active:scale-[0.97] active:bg-(--surface-2)",
                k === "00" ? "text-xl" : "text-2xl",
              )}
            >
              {k}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={submit}
        disabled={mutation.isPending || rupees <= 0}
        className="h-12 w-full text-base"
      >
        <Check className="h-4 w-4" aria-hidden />
        {mutation.isPending ? "Logging…" : "Log expense"}
      </Button>
    </div>
  );
}
