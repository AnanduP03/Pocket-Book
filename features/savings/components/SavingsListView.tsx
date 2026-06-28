"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { SavingsForm } from "./SavingsForm";
import { SavingsList } from "./SavingsList";
import {
  deleteSavingsAction,
  fetchSavings,
  fetchSavingsBalance,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";
import type { PlainSavingsEntry } from "@/db/repositories/savings";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";

type Props = {
  initialEntries: PlainSavingsEntry[];
  initialBalance: number;
  /** Per-bucket balances, keyed by goalId; "" key is the unallocated
   *  bucket. Serialized from a `Map<string|null, number>` server-side. */
  initialBalanceByGoal: Record<string, number>;
  goals: PlainNamedSavingsGoal[];
  defaultCurrency: string;
  defaultLocale: string;
};

export function SavingsListView({
  initialEntries,
  initialBalance,
  initialBalanceByGoal,
  goals,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState<"deposit" | "withdrawal" | null>(null);
  const [deleting, setDeleting] = useState<PlainSavingsEntry | null>(null);

  const { data: entries = initialEntries } = useQuery<PlainSavingsEntry[]>({
    queryKey: ["savings"],
    queryFn: fetchSavings,
    initialData: initialEntries,
  });

  const { data: balance = initialBalance } = useQuery<number>({
    queryKey: ["savings", "balance"],
    queryFn: fetchSavingsBalance,
    initialData: initialBalance,
  });

  const deleteWithUndo = (item: PlainSavingsEntry) => {
    queryClient.cancelQueries({ queryKey: ["savings"] });
    const prevEntries =
      queryClient.getQueryData<PlainSavingsEntry[]>(["savings"]) ?? null;
    const prevBalance =
      queryClient.getQueryData<number>(["savings", "balance"]) ?? null;

    if (prevEntries) {
      queryClient.setQueryData<PlainSavingsEntry[]>(
        ["savings"],
        prevEntries.filter((e) => e.id !== item.id),
      );
    }
    if (prevBalance !== null) {
      queryClient.setQueryData<number>(
        ["savings", "balance"],
        prevBalance - item.amountPaise,
      );
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await deleteSavingsAction(item.id);
      if (!res.ok) {
        if (prevEntries) queryClient.setQueryData(["savings"], prevEntries);
        if (prevBalance !== null)
          queryClient.setQueryData(["savings", "balance"], prevBalance);
        toast.error(res.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }, 6000);

    toast("Entry deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          if (prevEntries) queryClient.setQueryData(["savings"], prevEntries);
          if (prevBalance !== null)
            queryClient.setQueryData(["savings", "balance"], prevBalance);
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Reserve"
          title="Savings"
          description="Month-end surpluses sweep here automatically. Add deposits or pull when you need cover."
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={balance <= 0}
                onClick={() => setCreating("withdrawal")}
              >
                <ArrowDown className="h-4 w-4" aria-hidden /> Withdraw
              </Button>
              <Button type="button" onClick={() => setCreating("deposit")}>
                <ArrowUp className="h-4 w-4" aria-hidden /> Deposit
              </Button>
            </div>
          }
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "60ms" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
              >
                <PiggyBank className="h-4 w-4 text-(--text)" />
              </span>
              <CardTitle>Balance</CardTitle>
            </div>
          </CardHeader>
          <p
            className={
              balance >= 0
                ? "font-display text-4xl tabular-nums tracking-tight text-(--text) lg:text-5xl"
                : "font-display text-4xl tabular-nums tracking-tight text-(--danger) lg:text-5xl"
            }
          >
            {formatCurrency(balance, defaultCurrency, defaultLocale)}
          </p>
        </Card>
      </div>

      <section
        className="rise-in flex flex-col gap-3"
        style={{ animationDelay: "120ms" }}
      >
        <SectionLabel
          trailing={
            entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
              : undefined
          }
        >
          History
        </SectionLabel>
        <SavingsList
          entries={entries}
          currency={defaultCurrency}
          locale={defaultLocale}
          onDelete={(e) => setDeleting(e)}
        />
      </section>

      <SavingsForm
        open={creating === "deposit"}
        onOpenChange={(open) => {
          if (!open) setCreating(null);
        }}
        mode="deposit"
        goals={goals}
        balanceByGoal={initialBalanceByGoal}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />
      <SavingsForm
        open={creating === "withdrawal"}
        onOpenChange={(open) => {
          if (!open) setCreating(null);
        }}
        mode="withdrawal"
        goals={goals}
        balanceByGoal={initialBalanceByGoal}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this entry?"
        description={
          deleting
            ? `${formatCurrency(Math.abs(deleting.amountPaise), defaultCurrency, defaultLocale)} on ${new Date(deleting.effectiveDate).toLocaleDateString(defaultLocale)} — your balance will adjust.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) {
            const target = deleting;
            setDeleting(null);
            deleteWithUndo(target);
          }
        }}
      />
    </div>
  );
}
