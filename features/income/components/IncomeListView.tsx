"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
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

  const deleteWithUndo = (item: PlainIncomeEntry) => {
    queryClient.cancelQueries({ queryKey: ["income"] });
    const prev =
      queryClient.getQueryData<PlainIncomeEntry[]>(["income"]) ?? null;

    if (prev) {
      queryClient.setQueryData<PlainIncomeEntry[]>(
        ["income"],
        prev.filter((e) => e.id !== item.id),
      );
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await deleteIncomeAction(item.id);
      if (!res.ok) {
        if (prev) queryClient.setQueryData(["income"], prev);
        toast.error(res.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["income"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }, 6000);

    toast("Income entry deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          if (prev) queryClient.setQueryData(["income"], prev);
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Money in"
          title="Income"
          description="Track each income rate change. The most recent entry effective on or before today is what the dashboard uses."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden /> New entry
            </Button>
          }
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "60ms" }}>
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
          <p
            className={
              active
                ? "font-display text-4xl tabular-nums tracking-tight text-(--text) lg:text-5xl"
                : "font-display text-4xl tabular-nums tracking-tight text-(--muted) lg:text-5xl"
            }
          >
            {active
              ? formatCurrency(active.amountPaise, defaultCurrency, defaultLocale)
              : "—"}
          </p>
        </Card>
      </div>

      <section className="rise-in flex flex-col gap-3" style={{ animationDelay: "120ms" }}>
        <SectionLabel>History</SectionLabel>
        <IncomeList
          entries={entries}
          currency={defaultCurrency}
          locale={defaultLocale}
          onEdit={(e) => setEditing(e)}
          onDelete={(e) => setDeleting(e)}
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
