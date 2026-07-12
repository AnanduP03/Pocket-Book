"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { createVariableAction } from "../actions";
import {
  rankByRecent,
  useRecentCategories,
} from "../lib/use-recent-categories";
import { normalizeNote } from "../lib/normalize-note";
import { todayUtc } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
  compact?: boolean;
};

const LAST_CATEGORY_KEY = "pocketbook:last-variable-category";

export function VariableQuickAdd({
  categories,
  defaultCurrency,
  defaultLocale,
  compact = false,
}: Props) {
  const queryClient = useQueryClient();
  const { recent, recordUse } = useRecentCategories();
  const variableCats = categories.filter((c) => c.type === "Variable");
  // Recent first, fall back to original order. The chip row picks this up
  // automatically; user's "usuals" land at the start of the row.
  const rankedCats = rankByRecent(variableCats, recent);

  const [amountPaise, setAmountPaise] = useState(0);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState(variableCats[0]?.id ?? "");

  // Restore last-used category on mount
  useEffect(() => {
    if (variableCats.length === 0) return;
    const saved =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(LAST_CATEGORY_KEY);
    if (saved && variableCats.some((c) => c.id === saved)) {
      setCategoryId(saved);
    }
    // run once per category set change
  }, [variableCats.length]);

  const mutation = useMutation({
    mutationFn: () =>
      createVariableAction({
        date: todayUtc(),
        amountPaise,
        currency: defaultCurrency,
        categoryId,
        note: normalizeNote(label),
      }),
    onSettled: async () => {
      // Always reconcile with server. Invalidates both the variable list
      // and the dashboard so today's spend / heatmap pick up the new entry.
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      const cat = variableCats.find((c) => c.id === categoryId);
      toast.success(`Logged${cat ? ` · ${cat.name}` : ""}`);
      try {
        window.localStorage.setItem(LAST_CATEGORY_KEY, categoryId);
      } catch {
        // ignore storage errors
      }
      recordUse(categoryId);
      setAmountPaise(0);
      setLabel("");
      requestAnimationFrame(() => {
        const el =
          document.querySelector<HTMLInputElement>("#quick-add-amount");
        el?.focus();
      });
    },
    onError: () => {
      toast.error("Couldn't log expense — try again");
    },
  });

  function submit() {
    if (amountPaise <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    mutation.mutate();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (variableCats.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-4 text-sm text-(--muted)">
        Add a Variable category first to start quick-logging expenses.
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
        onKeyDown={onKeyDown}
      >
        <MoneyInput
          id="quick-add-amount"
          valueMinor={amountPaise}
          onChangeMinor={setAmountPaise}
          currency={defaultCurrency}
          locale={defaultLocale}
          autoFocus
          aria-label="Amount"
        />

        <div
          role="radiogroup"
          aria-label="Category"
          className="flex flex-wrap gap-2"
        >
          {rankedCats.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
                  active
                    ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                    : "border-(--border) bg-(--surface-2)/40 text-(--muted) hover:bg-(--surface-2) hover:text-(--text)",
                )}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: c.color }}
                />
                {c.name}
              </button>
            );
          })}
        </div>

        <Input
          type="text"
          autoComplete="off"
          maxLength={280}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a label (optional)"
          aria-label="Label"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={mutation.isPending}
          className="w-full"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {mutation.isPending ? "Logging…" : "Log expense"}
        </Button>

        <p className="text-xs text-(--muted)">
          Press{" "}
          <kbd className="rounded border border-(--border) bg-(--surface-2) px-1 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to log · Date is today
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-40">
          <MoneyInput
            id="quick-add-amount"
            valueMinor={amountPaise}
            onChangeMinor={setAmountPaise}
            currency={defaultCurrency}
            locale={defaultLocale}
            autoFocus
            aria-label="Amount"
          />
        </div>

        <div
          role="radiogroup"
          aria-label="Category"
          className="flex flex-1 flex-wrap gap-2"
        >
          {rankedCats.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
                  active
                    ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                    : "border-(--border) bg-(--surface-2)/40 text-(--muted) hover:bg-(--surface-2) hover:text-(--text)",
                )}
              >
                <CategoryIcon name={c.icon} color={c.color} size="sm" />
                {c.name}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={mutation.isPending}
          className="sm:self-stretch"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {mutation.isPending ? "Logging…" : "Log"}
        </Button>
      </div>

      <p className="text-xs text-(--muted)">
        Press{" "}
        <kbd className="rounded border border-(--border) bg-(--surface-2) px-1 font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to log · Date is today · Last category is remembered for next time.
      </p>
    </div>
  );
}
