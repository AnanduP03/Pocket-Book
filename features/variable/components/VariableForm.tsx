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
import { variableInputSchema, type VariableInput } from "../schema";
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
};

function defaultsFor(
  categories: PlainCategory[],
  defaultCurrency: string,
  expense: PlainVariable | undefined,
): VariableInput {
  if (expense) {
    return {
      date: new Date(expense.date),
      amountPaise: expense.amountPaise,
      currency: expense.currency,
      categoryId: expense.categoryId,
      note: expense.note,
    };
  }
  const firstCategoryId =
    categories.find((c) => c.type === "Variable")?.id ?? "";
  return {
    date: todayUtc(),
    amountPaise: 0,
    currency: defaultCurrency,
    categoryId: firstCategoryId,
    note: null,
  };
}

export function VariableForm({
  open,
  onOpenChange,
  categories,
  defaultCurrency,
  expense,
}: Props) {
  const editing = Boolean(expense);
  const queryClient = useQueryClient();

  const form = useForm<VariableInput>({
    resolver: zodResolver(variableInputSchema),
    defaultValues: defaultsFor(categories, defaultCurrency, expense),
    values: defaultsFor(categories, defaultCurrency, expense),
  });

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
      <SheetContent>
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
            <Label htmlFor="variable-category">Category</Label>
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <CategorySelect
                  id="variable-category"
                  categories={categories.filter((c) => c.type === "Variable")}
                  value={field.value}
                  onChange={field.onChange}
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
