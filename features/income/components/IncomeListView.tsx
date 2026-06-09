"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { IncomeForm } from "./IncomeForm";
import { IncomeList } from "./IncomeList";
import { deleteIncomeAction, fetchIncome } from "../actions";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { PlainIncomeEntry } from "@/db/repositories/income";

type Props = {
  initial: PlainIncomeEntry[];
  defaultCurrency: string;
  defaultLocale: string;
};

export function IncomeListView({
  initial,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlainIncomeEntry | null>(null);
  const [deleting, setDeleting] = useState<PlainIncomeEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: entries = initial } = useQuery<PlainIncomeEntry[]>({
    queryKey: ["income"],
    queryFn: fetchIncome,
    initialData: initial,
  });

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const active = entries.find(
    (e) => new Date(e.effectiveDate).getTime() <= todayUtc.getTime(),
  );

  const deleteMutation = useMutation({
    mutationFn: deleteIncomeAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["income"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Income entry deleted");
      setDeleting(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
          Income
        </h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden /> New income entry
        </Button>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Current rate</CardTitle>
            <CardDescription>
              {active
                ? `From ${formatDate(new Date(active.effectiveDate), defaultLocale)}`
                : "No income logged yet"}
            </CardDescription>
          </div>
        </CardHeader>
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-(--text)">
          {active
            ? formatCurrency(active.amountPaise, defaultCurrency, defaultLocale)
            : "—"}
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted)">
          History
        </h2>
        <IncomeList
          entries={entries}
          currency={defaultCurrency}
          locale={defaultLocale}
          onEdit={(e) => setEditing(e)}
          onDelete={(e) => setDeleting(e)}
          busyId={busyId}
        />
      </section>

      <IncomeForm
        open={creating}
        onOpenChange={setCreating}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />
      <IncomeForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
        {...(editing ? { entry: editing } : {})}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this income entry?"
        description={
          deleting
            ? `${formatCurrency(deleting.amountPaise, defaultCurrency, defaultLocale)} effective ${formatDate(new Date(deleting.effectiveDate), defaultLocale)}`
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
