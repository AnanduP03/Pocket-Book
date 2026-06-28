"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError, FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { DatePicker } from "@/features/shared/components/DatePicker";
import { savingsInputSchema, type SavingsInput } from "../schema";
import {
  createDepositAction,
  createWithdrawalAction,
  type ActionResult,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";
import type { PlainSavingsEntry } from "@/db/repositories/savings";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";
import { todayUtc } from "@/lib/format/date";

type Mode = "deposit" | "withdrawal";

/** Sentinel value for "Unallocated" in the goal <Select>. We can't use
 *  the empty string because shadcn's SelectItem rejects empty values. */
const UNALLOCATED_VALUE = "__unallocated__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  goals: PlainNamedSavingsGoal[];
  /** Per-bucket balances keyed by goalId ("" key = unallocated). */
  balanceByGoal: Record<string, number>;
  defaultCurrency: string;
  defaultLocale: string;
};

function pickDefaultGoalId(
  mode: Mode,
  goals: PlainNamedSavingsGoal[],
  balanceByGoal: Record<string, number>,
): string | null {
  if (goals.length === 0) return null;
  if (mode === "withdrawal") {
    // Withdraw from the goal with the largest positive balance —
    // that's the bucket most likely to have headroom.
    let bestId: string | null = null;
    let best = 0;
    for (const g of goals) {
      const bal = balanceByGoal[g.id] ?? 0;
      if (bal > best) {
        best = bal;
        bestId = g.id;
      }
    }
    return bestId;
  }
  // Deposit: prefer the *least funded* goal so the user nudges progress
  // where it's most needed. Falls back to the first goal.
  let bestId: string | null = goals[0]?.id ?? null;
  let worstPct = Infinity;
  for (const g of goals) {
    const bal = Math.max(0, balanceByGoal[g.id] ?? 0);
    const pct = g.amountPaise > 0 ? bal / g.amountPaise : 0;
    if (pct < worstPct) {
      worstPct = pct;
      bestId = g.id;
    }
  }
  return bestId;
}

export function SavingsForm({
  open,
  onOpenChange,
  mode,
  goals,
  balanceByGoal,
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
      goalId: pickDefaultGoalId(mode, goals, balanceByGoal),
    },
  });

  // Reset the goal default whenever the sheet (re-)opens so external
  // changes (e.g. a new sweep that filled a goal) influence the pick.
  useEffect(() => {
    if (open) {
      form.reset({
        amountPaise: 0,
        effectiveDate: todayUtc(),
        note: null,
        goalId: pickDefaultGoalId(mode, goals, balanceByGoal),
      });
    }
  }, [open, mode, goals, balanceByGoal, form]);

  const selectedGoalId = useWatch({ control: form.control, name: "goalId" });
  const selectedBucket = useMemo(() => {
    const bal = balanceByGoal[selectedGoalId ?? ""] ?? 0;
    const goal = goals.find((g) => g.id === selectedGoalId);
    return { bal, goal };
  }, [selectedGoalId, balanceByGoal, goals]);

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

  const hasGoals = goals.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          {hasGoals ? (
            <FormField>
              <Label htmlFor="savings-goal">
                {mode === "deposit" ? "Add to" : "Withdraw from"}
              </Label>
              <Controller
                name="goalId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? UNALLOCATED_VALUE}
                    onValueChange={(v) =>
                      field.onChange(v === UNALLOCATED_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger id="savings-goal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((g) => {
                        const bal = balanceByGoal[g.id] ?? 0;
                        const filled = bal >= g.amountPaise;
                        return (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ·{" "}
                            {formatCurrency(bal, defaultCurrency, defaultLocale)}
                            {filled ? " · ✓ reached" : ""}
                          </SelectItem>
                        );
                      })}
                      <SelectItem value={UNALLOCATED_VALUE}>
                        Unallocated ·{" "}
                        {formatCurrency(
                          balanceByGoal[""] ?? 0,
                          defaultCurrency,
                          defaultLocale,
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-(--muted)">
                {mode === "withdrawal"
                  ? `Available in this bucket: ${formatCurrency(
                      selectedBucket.bal,
                      defaultCurrency,
                      defaultLocale,
                    )}`
                  : selectedBucket.goal
                    ? `Target: ${formatCurrency(
                        selectedBucket.goal.amountPaise,
                        defaultCurrency,
                        defaultLocale,
                      )} · current: ${formatCurrency(
                        selectedBucket.bal,
                        defaultCurrency,
                        defaultLocale,
                      )}`
                    : `Unallocated balance: ${formatCurrency(
                        selectedBucket.bal,
                        defaultCurrency,
                        defaultLocale,
                      )}`}
              </p>
            </FormField>
          ) : null}

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
