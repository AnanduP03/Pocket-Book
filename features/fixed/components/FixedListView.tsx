"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { CollapsibleSection } from "@/features/variable/components/CollapsibleSection";
import { FixedForm } from "./FixedForm";
import { FixedList } from "./FixedList";
import { FixedHistorySheet } from "./FixedHistorySheet";
import { FixedAnchorBar } from "./FixedAnchorBar";
import {
  FixedFilterPill,
  type FixedFiltersState,
} from "./FixedFilterPill";
import { AutoDebitBanner } from "./AutoDebitBanner";
import {
  deleteFixedAction,
  fetchAutoDebitNeedsConfirm,
  fetchFixed,
  fetchFixedMonthPayments,
  markPaidAction,
  setActiveAction,
  skipCycleAction,
  unmarkPaidAction,
  unskipCycleAction,
} from "../actions";
import { useFixedOptimisticMutation } from "../hooks/use-fixed-optimistic-mutation";
import { groupByStatus } from "../lib/group-by-status";
import { thisMonthSummary } from "../lib/this-month-summary";
import { annualOccurrences, ruleOf } from "../lib/billing";
import { utcMidnight } from "@/lib/format/date";
import { formatCurrency } from "@/lib/format/money";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainPayment } from "@/db/repositories/payments";

type Props = {
  initial: PlainFixedExpense[];
  initialAutoDebit: PlainFixedExpense[];
  initialMonthPayments: PlainPayment[];
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
};

export function FixedListView({
  initial,
  initialAutoDebit,
  initialMonthPayments,
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

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState<FixedFiltersState>(() => {
    const cat = searchParams.get("cat");
    const q = searchParams.get("q");
    return {
      categoryIds: cat ? cat.split(",").filter(Boolean) : [],
      text: q ?? "",
    };
  });
  const setFilters = (next: FixedFiltersState) => {
    setFiltersState(next);
    const params = new URLSearchParams();
    if (next.categoryIds.length > 0)
      params.set("cat", next.categoryIds.join(","));
    if (next.text) params.set("q", next.text);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const { data: items = initial } = useQuery<PlainFixedExpense[]>({
    queryKey: ["fixed"],
    queryFn: fetchFixed,
    initialData: initial,
  });

  const { data: pendingAutoDebit = initialAutoDebit } = useQuery<
    PlainFixedExpense[]
  >({
    queryKey: ["auto-debit"],
    queryFn: fetchAutoDebitNeedsConfirm,
    initialData: initialAutoDebit,
  });

  const fixedIds = useMemo(() => items.map((f) => f.id), [items]);
  const { data: monthPayments = initialMonthPayments } = useQuery<
    PlainPayment[]
  >({
    queryKey: ["fixed-payments"],
    queryFn: () => fetchFixedMonthPayments(fixedIds),
    initialData: initialMonthPayments,
  });

  const filtered = useMemo(() => {
    const text = filters.text.trim().toLowerCase();
    const cats = new Set(filters.categoryIds);
    return items.filter((f) => {
      if (cats.size > 0 && !cats.has(f.categoryId)) return false;
      if (text && !f.name.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [items, filters]);

  const groups = useMemo(() => groupByStatus(filtered), [filtered]);

  const summary = useMemo(
    () => thisMonthSummary(items, monthPayments),
    [items, monthPayments],
  );

  const annualOutlay = useMemo(() => {
    const now = new Date();
    let totalAnnualPaise = 0;
    let monthlyBills = 0;
    let subscriptions = 0;
    for (const f of items) {
      if (!f.isActive) continue;
      const occ = annualOccurrences(ruleOf(f), now);
      totalAnnualPaise += Math.round(occ * f.amountPaise);
      if (f.intervalUnit === "month" && f.intervalValue === 1) monthlyBills++;
      else subscriptions++;
    }
    return {
      totalAnnualPaise,
      monthlyEquivPaise: Math.round(totalAnnualPaise / 12),
      monthlyBills,
      subscriptions,
    };
  }, [items]);

  const markPaidMutation = useFixedOptimisticMutation(
    {
      mutationFn: markPaidAction,
      busyId: (id: string) => id,
      patch: (_id, f) => ({ ...f, lastPaidDate: utcMidnight(new Date()) }),
      successMessage: "Marked paid",
      errorMessage: "Couldn't mark paid — try again",
    },
    setBusyId,
  );

  const unmarkPaidMutation = useFixedOptimisticMutation(
    {
      mutationFn: unmarkPaidAction,
      busyId: (id: string) => id,
      patch: (_id, f) => ({ ...f, lastPaidDate: null }),
      successMessage: "Latest payment removed",
      errorMessage: "Couldn't undo payment",
    },
    setBusyId,
  );

  const skipCycleMutation = useFixedOptimisticMutation(
    {
      mutationFn: skipCycleAction,
      busyId: (id: string) => id,
      patch: (_id, f) => f,
      successMessage: "Skipped this cycle",
      errorMessage: "Couldn't skip cycle",
    },
    setBusyId,
  );

  const unskipCycleMutation = useFixedOptimisticMutation(
    {
      mutationFn: unskipCycleAction,
      busyId: (id: string) => id,
      patch: (_id, f) => f,
      successMessage: "Skip undone",
      errorMessage: "Couldn't undo skip",
    },
    setBusyId,
  );

  const deleteWithUndo = (item: PlainFixedExpense) => {
    queryClient.cancelQueries({ queryKey: ["fixed"] });
    const prevFixed =
      queryClient.getQueryData<PlainFixedExpense[]>(["fixed"]) ?? null;
    const prevAutoDebit =
      queryClient.getQueryData<PlainFixedExpense[]>(["auto-debit"]) ?? null;

    if (prevFixed) {
      queryClient.setQueryData<PlainFixedExpense[]>(
        ["fixed"],
        prevFixed.filter((f) => f.id !== item.id),
      );
    }
    if (prevAutoDebit) {
      queryClient.setQueryData<PlainFixedExpense[]>(
        ["auto-debit"],
        prevAutoDebit.filter((f) => f.id !== item.id),
      );
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await deleteFixedAction(item.id);
      if (!res.ok) {
        if (prevFixed) queryClient.setQueryData(["fixed"], prevFixed);
        if (prevAutoDebit) queryClient.setQueryData(["auto-debit"], prevAutoDebit);
        toast.error(res.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
      await queryClient.invalidateQueries({ queryKey: ["fixed-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }, 6000);

    toast(`Deleted "${item.name}"`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          if (prevFixed) queryClient.setQueryData(["fixed"], prevFixed);
          if (prevAutoDebit)
            queryClient.setQueryData(["auto-debit"], prevAutoDebit);
        },
      },
    });
  };

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
    <div className="flex flex-col gap-6 pb-20">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Commitments"
          title="Fixed expenses"
          description="Recurring bills, subscriptions, and rent. Mark them paid each cycle so the dashboard knows what's still owed."
          action={
            <Button
              onClick={() => setCreating(true)}
              disabled={
                categories.filter((c) => c.type === "Fixed").length === 0
              }
            >
              <Plus className="h-4 w-4" aria-hidden /> New
            </Button>
          }
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "30ms" }}>
        <AutoDebitBanner
          pending={pendingAutoDebit}
          currency={defaultCurrency}
          locale={defaultLocale}
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "60ms" }}>
        <FixedAnchorBar
          duePaise={summary.duePaise}
          paidPaise={summary.paidPaise}
          remainingPaise={summary.remainingPaise}
          overdueCount={summary.overdueCount}
          currency={defaultCurrency}
          locale={defaultLocale}
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "120ms" }}>
        <FixedFilterPill
          filters={filters}
          onChange={setFilters}
          categories={categories}
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "180ms" }}>
        <FixedList
          groups={groups}
          categories={categories}
          currency={defaultCurrency}
          locale={defaultLocale}
          onEdit={(f) => setEditing(f)}
          onHistory={(f) => setHistory(f)}
          onMarkPaid={(f) => markPaidMutation.mutate(f.id)}
          onUnmarkPaid={(f) => unmarkPaidMutation.mutate(f.id)}
          onSkip={(f) => skipCycleMutation.mutate(f.id)}
          onUnskip={(f) => unskipCycleMutation.mutate(f.id)}
          onToggleActive={(f) =>
            toggleActiveMutation.mutate({ id: f.id, isActive: !f.isActive })
          }
          onDelete={(f) => setDeleting(f)}
          busyId={busyId}
          emptyMessage={
            filters.categoryIds.length > 0 || filters.text
              ? "Nothing matches those filters."
              : "No bills tracked yet. Add a recurring expense and we'll surface what's due, what's overdue, and what's still ahead."
          }
        />
      </div>

      <div className="rise-in flex flex-col gap-3" style={{ animationDelay: "240ms" }}>
        <CollapsibleSection
          title="Annual outlay"
          hidden={annualOutlay.totalAnnualPaise === 0}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-display text-2xl tabular-nums tracking-tight text-(--text)">
              ≈{" "}
              {formatCurrency(
                annualOutlay.totalAnnualPaise,
                defaultCurrency,
                defaultLocale,
              )}
              <span className="ml-1 text-sm font-normal text-(--muted)">
                / year
              </span>
            </p>
            <p className="tabular-nums text-sm text-(--muted)">
              ≈{" "}
              {formatCurrency(
                annualOutlay.monthlyEquivPaise,
                defaultCurrency,
                defaultLocale,
              )}{" "}
              / month
            </p>
          </div>
          <p className="mt-1 text-[11px] text-(--muted)">
            {annualOutlay.subscriptions}{" "}
            {annualOutlay.subscriptions === 1 ? "subscription" : "subscriptions"}
            {" · "}
            {annualOutlay.monthlyBills}{" "}
            {annualOutlay.monthlyBills === 1 ? "monthly bill" : "monthly bills"}
          </p>
        </CollapsibleSection>
      </div>

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
