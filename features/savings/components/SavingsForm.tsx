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
import { savingsInputSchema, type SavingsInput } from "../schema";
import {
  createDepositAction,
  createWithdrawalAction,
  type ActionResult,
} from "../actions";
import type { PlainSavingsEntry } from "@/db/repositories/savings";
import { todayUtc } from "@/lib/format/date";

type Mode = "deposit" | "withdrawal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  defaultCurrency: string;
  defaultLocale: string;
};

export function SavingsForm({
  open,
  onOpenChange,
  mode,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();

  const form = useForm<SavingsInput>({
    resolver: zodResolver(savingsInputSchema),
    defaultValues: {
      amountPaise: 0,
      effectiveDate: todayUtc(),
      note: null,
    },
  });

  const mutation = useMutation<ActionResult<PlainSavingsEntry>, Error, SavingsInput>({
    mutationFn: (values) =>
      mode === "deposit"
        ? createDepositAction(values)
        : createWithdrawalAction(values),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error.field) {
          form.setError(res.error.field as keyof SavingsInput, {
            message: res.error.message,
          });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
      toast.success(mode === "deposit" ? "Deposit added" : "Withdrawal recorded");
      onOpenChange(false);
      form.reset({
        amountPaise: 0,
        effectiveDate: todayUtc(),
        note: null,
      });
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  const title = mode === "deposit" ? "Add deposit" : "Withdraw";
  const submitLabel =
    mode === "deposit"
      ? mutation.isPending
        ? "Saving…"
        : "Add deposit"
      : mutation.isPending
        ? "Saving…"
        : "Withdraw";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <FormField>
            <Label htmlFor="savings-amount">Amount</Label>
            <Controller
              name="amountPaise"
              control={form.control}
              render={({ field }) => (
                <MoneyInput
                  id="savings-amount"
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
            <Label htmlFor="savings-date">Date</Label>
            <Controller
              name="effectiveDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="savings-date"
                  value={field.value ?? null}
                  onChange={(d) => field.onChange(d ?? new Date())}
                  ariaInvalid={Boolean(form.formState.errors.effectiveDate)}
                />
              )}
            />
            <FormError message={form.formState.errors.effectiveDate?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="savings-note">Note</Label>
            <Input
              id="savings-note"
              placeholder="What was this for?"
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
            <Button
              type="submit"
              variant={mode === "withdrawal" ? "danger" : "primary"}
              disabled={mutation.isPending}
            >
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
