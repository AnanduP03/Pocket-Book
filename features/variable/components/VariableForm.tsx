"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { DatePicker } from "@/features/shared/components/DatePicker";
import { CategorySelect } from "@/features/shared/components/CategorySelect";
import { TagInput } from "./TagInput";
import { variableInputSchema, type VariableInput } from "../schema";
import {
  buildCategoryIndex,
  predictCategory,
} from "../lib/predict-category";
import {
  createVariableAction,
  updateVariableAction,
  type ActionResult,
} from "../actions";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainVariable } from "@/db/repositories/variable";
import { todayUtc } from "@/lib/format/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PlainCategory[];
  defaultCurrency: string;
  expense?: PlainVariable;
  /** Past variable expenses used to predict a category from a typed note. */
  recentForPrediction?: PlainVariable[];
  /** Pre-fill values when creating (ignored when editing). Used by ritual
   *  chips and other "log this again" entry points. */
  initialDefaults?: Partial<VariableInput>;
};

function defaultsFor(
  categories: PlainCategory[],
  defaultCurrency: string,
  expense: PlainVariable | undefined,
  initialDefaults: Partial<VariableInput> | undefined,
): VariableInput {
  if (expense) {
    return {
      date: new Date(expense.date),
      amountPaise: expense.amountPaise,
      currency: expense.currency,
      categoryId: expense.categoryId,
      note: expense.note,
      tags: [...expense.tags],
    };
  }
  const firstCategoryId =
    categories.find((c) => c.type === "Variable")?.id ?? "";
  const base: VariableInput = {
    date: todayUtc(),
    amountPaise: 0,
    currency: defaultCurrency,
    categoryId: firstCategoryId,
    note: null,
    tags: [],
  };
  return { ...base, ...(initialDefaults ?? {}) };
}

export function VariableForm({
  open,
  onOpenChange,
  categories,
  defaultCurrency,
  expense,
  recentForPrediction,
  initialDefaults,
}: Props) {
  const editing = Boolean(expense);
  const queryClient = useQueryClient();

  const form = useForm<VariableInput>({
    resolver: zodResolver(variableInputSchema),
    defaultValues: defaultsFor(categories, defaultCurrency, expense, initialDefaults),
    values: defaultsFor(categories, defaultCurrency, expense, initialDefaults),
  });

  // Smart category pre-fill: build a token → category index from history,
  // watch the note field, predict + auto-set the category if the user
  // hasn't manually picked one yet.
  const variableCategoryIds = useMemo(
    () =>
      new Set(
        categories.filter((c) => c.type === "Variable").map((c) => c.id),
      ),
    [categories],
  );
  const predictionIndex = useMemo(
    () => buildCategoryIndex(recentForPrediction ?? []),
    [recentForPrediction],
  );
  // Top tags from history, ordered by frequency. Drives the suggestion row
  // in the tag input so users can re-use rituals like "guilt", "gift", "work".
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of recentForPrediction ?? []) {
      for (const t of v.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);
  }, [recentForPrediction]);
  const userTouchedCategory = useRef(false);
  const [predictionApplied, setPredictionApplied] = useState<string | null>(
    null,
  );
  const noteValue = form.watch("note");

  useEffect(() => {
    // Only predict on create; never override an existing expense's category.
    if (editing) return;
    if (userTouchedCategory.current) return;
    const predicted = predictCategory(
      noteValue,
      predictionIndex,
      variableCategoryIds,
    );
    if (predicted && predicted !== form.getValues("categoryId")) {
      form.setValue("categoryId", predicted, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
      setPredictionApplied(predicted);
    } else if (!predicted) {
      setPredictionApplied(null);
    }
  }, [noteValue, predictionIndex, variableCategoryIds, editing, form]);

  // Reset interaction tracking each time the sheet reopens for a fresh log.
  useEffect(() => {
    if (open && !editing) {
      userTouchedCategory.current = false;
      setPredictionApplied(null);
    }
  }, [open, editing]);

  const predictedCategoryName =
    predictionApplied != null
      ? (categories.find((c) => c.id === predictionApplied)?.name ?? null)
      : null;

  const mutation = useMutation<ActionResult<PlainVariable>, Error, VariableInput>({
    mutationFn: (values) =>
      editing && expense
        ? updateVariableAction(expense.id, values)
        : createVariableAction(values),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error.field) {
          form.setError(res.error.field as keyof VariableInput, {
            message: res.error.message,
          });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
      toast.success(editing ? "Expense updated" : "Expense logged");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit expense" : "Log an expense"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <Label htmlFor="variable-date">Date</Label>
              <Controller
                name="date"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    id="variable-date"
                    value={field.value ?? null}
                    onChange={(d) => field.onChange(d ?? new Date())}
                    ariaInvalid={Boolean(form.formState.errors.date)}
                    max={todayUtc()}
                  />
                )}
              />
              <FormError message={form.formState.errors.date?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="variable-amount">Amount</Label>
              <Controller
                name="amountPaise"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="variable-amount"
                    valueMinor={field.value}
                    onChangeMinor={field.onChange}
                    currency={form.watch("currency")}
                    aria-invalid={Boolean(form.formState.errors.amountPaise)}
                  />
                )}
              />
              <FormError message={form.formState.errors.amountPaise?.message} />
            </FormField>
          </div>

          <FormField>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="variable-category">Category</Label>
              {predictedCategoryName ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1 rounded-full bg-(--accent)/20 px-2 py-0.5 text-[11px] text-(--text)"
                >
                  <Sparkles className="h-3 w-3 text-(--accent)" aria-hidden />
                  Auto-set: {predictedCategoryName}
                </span>
              ) : null}
            </div>
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <CategorySelect
                  id="variable-category"
                  categories={categories.filter((c) => c.type === "Variable")}
                  value={field.value}
                  onChange={(next) => {
                    userTouchedCategory.current = true;
                    setPredictionApplied(null);
                    field.onChange(next);
                  }}
                  ariaInvalid={Boolean(form.formState.errors.categoryId)}
                />
              )}
            />
            <FormError message={form.formState.errors.categoryId?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="variable-note">Note</Label>
            <Input
              id="variable-note"
              placeholder="What was this for?"
              {...form.register("note", {
                setValueAs: (v: unknown) => {
                  if (typeof v !== "string") return null;
                  const trimmed = v.trim();
                  return trimmed === "" ? null : trimmed;
                },
              })}
              aria-invalid={Boolean(form.formState.errors.note)}
            />
            <FormError message={form.formState.errors.note?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="variable-tags">Tags</Label>
            <Controller
              name="tags"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  id="variable-tags"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  suggestions={tagSuggestions}
                />
              )}
            />
            <FormError message={form.formState.errors.tags?.message} />
          </FormField>

          <FormError message={form.formState.errors.root?.message} />

          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Log expense"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
