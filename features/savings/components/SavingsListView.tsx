"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

type Props = {
  initialEntries: PlainSavingsEntry[];
  initialBalance: number;
  defaultCurrency: string;
  defaultLocale: string;
};

export function SavingsListView({
  initialEntries,
  initialBalance,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState<"deposit" | "withdrawal" | null>(null);
  const [deleting, setDeleting] = useState<PlainSavingsEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: deleteSavingsAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Entry deleted");
      setDeleting(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
          Savings
        </h1>
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
            <ArrowUp className="h-4 w-4" aria-hidden /> Add deposit
          </Button>
        </div>
      </header>

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
              ? "tabular-nums text-4xl font-semibold tracking-tight text-(--text)"
              : "tabular-nums text-4xl font-semibold tracking-tight text-(--danger)"
          }
        >
          {formatCurrency(balance, defaultCurrency, defaultLocale)}
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted)">
          History
        </h2>
        <SavingsList
          entries={entries}
          currency={defaultCurrency}
          locale={defaultLocale}
          onDelete={(e) => setDeleting(e)}
          busyId={busyId}
        />
      </section>

      <SavingsForm
        open={creating === "deposit"}
        onOpenChange={(open) => {
          if (!open) setCreating(null);
        }}
        mode="deposit"
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />
      <SavingsForm
        open={creating === "withdrawal"}
        onOpenChange={(open) => {
          if (!open) setCreating(null);
        }}
        mode="withdrawal"
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
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
