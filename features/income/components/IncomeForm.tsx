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
import { incomeInputSchema, type IncomeInput } from "../schema";
import {
  createIncomeAction,
  updateIncomeAction,
  type ActionResult,
} from "../actions";
import type { PlainIncomeEntry } from "@/db/repositories/income";
import { todayUtc } from "@/lib/format/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCurrency: string;
  defaultLocale: string;
  entry?: PlainIncomeEntry;
};

function defaultsFor(entry: PlainIncomeEntry | undefined): IncomeInput {
  if (entry) {
    return {
      amountPaise: entry.amountPaise,
      effectiveDate: new Date(entry.effectiveDate),
      note: entry.note,
    };
  }
  return {
    amountPaise: 0,
    effectiveDate: todayUtc(),
    note: null,
  };
}

export function IncomeForm({
  open,
  onOpenChange,
  defaultCurrency,
  defaultLocale,
  entry,
}: Props) {
  const editing = Boolean(entry);
  const queryClient = useQueryClient();

  const form = useForm<IncomeInput>({
    resolver: zodResolver(incomeInputSchema),
    defaultValues: defaultsFor(entry),
    values: defaultsFor(entry),
  });

  const mutation = useMutation<ActionResult<PlainIncomeEntry>, Error, IncomeInput>({
    mutationFn: (values) =>
      editing && entry
        ? updateIncomeAction(entry.id, values)
        : createIncomeAction(values),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error.field) {
          form.setError(res.error.field as keyof IncomeInput, {
            message: res.error.message,
          });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["income"] });
      toast.success(editing ? "Income updated" : "Income logged");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit income" : "New income"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <FormField>
            <Label htmlFor="income-amount">Amount</Label>
            <Controller
              name="amountPaise"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="income-amount"
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
            <Label htmlFor="income-date">Effective from</Label>
            <Controller
              name="effectiveDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="income-date"
                  value={field.value ?? null}
                  onChange={(d) => field.onChange(d ?? new Date())}
                  ariaInvalid={Boolean(form.formState.errors.effectiveDate)}
                />
              )}
            />
            <FormError message={form.formState.errors.effectiveDate?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="income-note">Note</Label>
            <Input
              id="income-note"
              placeholder="Annual increment, promotion…"
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
              {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Log income"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
