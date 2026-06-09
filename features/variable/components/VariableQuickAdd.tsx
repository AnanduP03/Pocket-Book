"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { createVariableAction } from "../actions";
import { todayUtc } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
};

const LAST_CATEGORY_KEY = "pocketbook:last-variable-category";

export function VariableQuickAdd({
  categories,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const variableCats = categories.filter((c) => c.type === "Variable");

  const [amountPaise, setAmountPaise] = useState(0);
  const [categoryId, setCategoryId] = useState(variableCats[0]?.id ?? "");

  // Restore last-used category on mount
  useEffect(() => {
    if (variableCats.length === 0) return;
    const saved = typeof window === "undefined"
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
        note: null,
      }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
      const cat = variableCats.find((c) => c.id === categoryId);
      toast.success(`Logged${cat ? ` · ${cat.name}` : ""}`);
      try {
        window.localStorage.setItem(LAST_CATEGORY_KEY, categoryId);
      } catch {
        // ignore storage errors
      }
      setAmountPaise(0);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          "#quick-add-amount",
        );
        el?.focus();
      });
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
          className="flex flex-1 flex-wrap gap-1.5"
        >
          {variableCats.map((c) => {
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
