"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { IntervalPicker } from "./IntervalPicker";
import { fixedInputSchema, type FixedInput } from "../schema";
import {
  createFixedAction,
  updateFixedAction,
  type ActionResult,
} from "../actions";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import { todayUtc } from "@/lib/format/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
  fixed?: PlainFixedExpense;
};

function defaultsFor(
  categories: PlainCategory[],
  fixed: PlainFixedExpense | undefined,
): FixedInput {
  if (fixed) {
    return {
      name: fixed.name,
      amountPaise: fixed.amountPaise,
      categoryId: fixed.categoryId,
      isActive: fixed.isActive,
      isAutoDebit: fixed.isAutoDebit,
      startDate: new Date(fixed.startDate),
      intervalValue: fixed.intervalValue,
      intervalUnit: fixed.intervalUnit,
      endDate: fixed.endDate ? new Date(fixed.endDate) : null,
      note: fixed.note,
    };
  }
  const firstCategoryId = categories.find((c) => c.type === "Fixed")?.id ?? "";
  return {
    name: "",
    amountPaise: 0,
    categoryId: firstCategoryId,
    isActive: true,
    isAutoDebit: false,
    startDate: todayUtc(),
    intervalValue: 1,
    intervalUnit: "month",
    endDate: null,
    note: null,
  };
}

export function FixedForm({
  open,
  onOpenChange,
  categories,
  defaultCurrency,
  defaultLocale,
  fixed,
}: Props) {
  const editing = Boolean(fixed);
  const queryClient = useQueryClient();

  const form = useForm<FixedInput>({
    resolver: zodResolver(fixedInputSchema),
    defaultValues: defaultsFor(categories, fixed),
    values: defaultsFor(categories, fixed),
  });

  const isAutoDebit = form.watch("isAutoDebit");

  const mutation = useMutation<ActionResult<PlainFixedExpense>, Error, FixedInput>({
    mutationFn: (values) =>
      editing && fixed
        ? updateFixedAction(fixed.id, values)
        : createFixedAction(values),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error.field) {
          form.setError(res.error.field as keyof FixedInput, {
            message: res.error.message,
          });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
      toast.success(editing ? "Fixed expense updated" : "Fixed expense added");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  const fixedCategories = categories.filter((c) => c.type === "Fixed");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit fixed expense" : "New fixed expense"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <FormField>
            <Label htmlFor="fixed-name">Name</Label>
            <Input
              id="fixed-name"
              autoFocus
              placeholder="Rent, Spotify, EMI…"
              {...form.register("name")}
              aria-invalid={Boolean(form.formState.errors.name)}
            />
            <FormError message={form.formState.errors.name?.message} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <Label htmlFor="fixed-amount">Amount</Label>
              <Controller
                name="amountPaise"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    id="fixed-amount"
                    valueMinor={field.value}
                    onChangeMinor={field.onChange}
                    currency={defaultCurrency}
                    locale={defaultLocale}
                    aria-invalid={Boolean(form.formState.errors.amountPaise)}
                  />
                )}
              />
              <FormError message={form.formState.errors.amountPaise?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="fixed-category">Category</Label>
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <CategorySelect
                    id="fixed-category"
                    categories={fixedCategories}
                    value={field.value}
                    onChange={field.onChange}
                    ariaInvalid={Boolean(form.formState.errors.categoryId)}
                  />
                )}
              />
              <FormError message={form.formState.errors.categoryId?.message} />
            </FormField>
          </div>

          <div className="rounded-[var(--radius-card)] border border-(--border) bg-(--surface-2)/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--muted)">
              Schedule
            </p>

            <FormField>
              <Label>Repeats</Label>
              <Controller
                name="intervalValue"
                control={form.control}
                render={({ field: valField }) => (
                  <Controller
                    name="intervalUnit"
                    control={form.control}
                    render={({ field: unitField }) => (
                      <IntervalPicker
                        intervalValue={valField.value}
                        intervalUnit={unitField.value}
                        onIntervalValueChange={valField.onChange}
                        onIntervalUnitChange={unitField.onChange}
                      />
                    )}
                  />
                )}
              />
            </FormField>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <FormField>
                <Label htmlFor="fixed-start">Start date</Label>
                <Controller
                  name="startDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      id="fixed-start"
                      value={field.value ?? null}
                      onChange={(d) => field.onChange(d ?? new Date())}
                      ariaInvalid={Boolean(form.formState.errors.startDate)}
                    />
                  )}
                />
                <FormError message={form.formState.errors.startDate?.message} />
              </FormField>

              <FormField>
                <Label htmlFor="fixed-end">End date (optional)</Label>
                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      id="fixed-end"
                      value={field.value}
                      onChange={(d) => field.onChange(d)}
                      ariaInvalid={Boolean(form.formState.errors.endDate)}
                    />
                  )}
                />
                <FormError message={form.formState.errors.endDate?.message} />
              </FormField>
            </div>
          </div>

          <FormField>
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface) p-3">
              <input
                type="checkbox"
                checked={isAutoDebit}
                onChange={(e) =>
                  form.setValue("isAutoDebit", e.target.checked, {
                    shouldDirty: true,
                  })
                }
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium text-(--text)">
                  Auto-debit
                </span>
                <span className="block text-xs text-(--muted)">
                  Dashboard will prompt you to confirm each cycle.
                </span>
              </span>
            </label>
          </FormField>

          <FormField>
            <Label htmlFor="fixed-note">Note</Label>
            <Input
              id="fixed-note"
              placeholder="Any extra context"
              {...form.register("note", {
                setValueAs: (v: unknown) => {
                  if (typeof v !== "string") return null;
                  const trimmed = v.trim();
                  return trimmed === "" ? null : trimmed;
                },
              })}
            />
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
              {mutation.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add fixed expense"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
