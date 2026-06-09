"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { FixedForm } from "./FixedForm";
import { FixedList } from "./FixedList";
import { FixedHistorySheet } from "./FixedHistorySheet";
import {
  deleteFixedAction,
  fetchAutoDebitNeedsConfirm,
  fetchFixed,
  markPaidAction,
  setActiveAction,
  unmarkPaidAction,
} from "../actions";
import { AutoDebitBanner } from "./AutoDebitBanner";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import { deriveStatus, type Rule } from "../lib/billing";

type Props = {
  initial: PlainFixedExpense[];
  initialAutoDebit: PlainFixedExpense[];
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
};

function ruleOf(f: PlainFixedExpense): Rule {
  return {
    startDate: new Date(f.startDate),
    intervalValue: f.intervalValue,
    intervalUnit: f.intervalUnit,
    endDate: f.endDate ? new Date(f.endDate) : null,
  };
}

export function FixedListView({
  initial,
  initialAutoDebit,
  categories,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlainFixedExpense | null>(null);
  const [history, setHistory] = useState<PlainFixedExpense | null>(null);
  const [deleting, setDeleting] = useState<PlainFixedExpense | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: items = initial } = useQuery<PlainFixedExpense[]>({
    queryKey: ["fixed"],
    queryFn: fetchFixed,
    initialData: initial,
  });

  const { data: pendingAutoDebit = initialAutoDebit } = useQuery<PlainFixedExpense[]>({
    queryKey: ["auto-debit"],
    queryFn: fetchAutoDebitNeedsConfirm,
    initialData: initialAutoDebit,
  });

  const grouped = useMemo(() => {
    const now = new Date();
    const active: PlainFixedExpense[] = [];
    const inactive: PlainFixedExpense[] = [];
    for (const f of items) {
      const status = deriveStatus(
        ruleOf(f),
        f.lastPaidDate ? new Date(f.lastPaidDate) : null,
        now,
        f.isActive,
      );
      if (status === "inactive" || status === "ended") inactive.push(f);
      else active.push(f);
    }
    return { active, inactive };
  }, [items]);

  const markPaidMutation = useMutation({
    mutationFn: markPaidAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Marked paid");
    },
  });

  const unmarkPaidMutation = useMutation({
    mutationFn: unmarkPaidAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Latest payment removed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFixedAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Fixed expense deleted");
      setDeleting(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setActiveAction(id, isActive),
    onMutate: ({ id }) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(res.data.isActive ? "Activated" : "Paused");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
          Fixed expenses
        </h1>
        <Button
          onClick={() => setCreating(true)}
          disabled={categories.filter((c) => c.type === "Fixed").length === 0}
        >
          <Plus className="h-4 w-4" aria-hidden /> New fixed expense
        </Button>
      </header>

      <AutoDebitBanner
        pending={pendingAutoDebit}
        currency={defaultCurrency}
        locale={defaultLocale}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted)">
          Active
        </h2>
        <FixedList
          items={grouped.active}
          categories={categories}
          currency={defaultCurrency}
          locale={defaultLocale}
          onEdit={(f) => setEditing(f)}
          onHistory={(f) => setHistory(f)}
          onMarkPaid={(f) => markPaidMutation.mutate(f.id)}
          onUnmarkPaid={(f) => unmarkPaidMutation.mutate(f.id)}
          onToggleActive={(f) =>
            toggleActiveMutation.mutate({ id: f.id, isActive: !f.isActive })
          }
          onDelete={(f) => setDeleting(f)}
          busyId={busyId}
          emptyMessage="No active fixed expenses. Add one above to start tracking your commitments."
        />
      </section>

      {grouped.inactive.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-(--muted)">
            Paused / Ended
          </h2>
          <FixedList
            items={grouped.inactive}
            categories={categories}
            currency={defaultCurrency}
            locale={defaultLocale}
            onEdit={(f) => setEditing(f)}
            onHistory={(f) => setHistory(f)}
            onMarkPaid={(f) => markPaidMutation.mutate(f.id)}
            onUnmarkPaid={(f) => unmarkPaidMutation.mutate(f.id)}
            onToggleActive={(f) =>
              toggleActiveMutation.mutate({ id: f.id, isActive: !f.isActive })
            }
            onDelete={(f) => setDeleting(f)}
            busyId={busyId}
          />
        </section>
      ) : null}

      <FixedForm
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />
      <FixedForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        categories={categories}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
        {...(editing ? { fixed: editing } : {})}
      />

      <FixedHistorySheet
        open={Boolean(history)}
        onOpenChange={(open) => {
          if (!open) setHistory(null);
        }}
        fixed={history}
        currency={defaultCurrency}
        locale={defaultLocale}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Delete ${deleting?.name ?? "fixed expense"}?`}
        description="Payment history will also be removed."
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
