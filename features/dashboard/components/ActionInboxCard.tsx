"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  HandCoins,
  Zap,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { confirmAutoDebitAction } from "@/features/fixed/actions";
import {
  coverMonthShortfallAction,
  sweepMonthSurplusAction,
  type SweepAllocation,
} from "@/features/savings/actions";
import { SplitSweepDialog } from "@/features/savings/components/SplitSweepDialog";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainNamedSavingsGoal } from "@/db/repositories/settings";
import type { FixedStatusCounts } from "../queries";
import type {
  PendingSweep,
  ShortfallHint,
} from "../queries";

type Props = {
  currency: string;
  locale: string;
  statusCounts: FixedStatusCounts;
  remainingFixedPaise: number;
  pendingSweep: PendingSweep | null;
  shortfallHint: ShortfallHint | null;
  autoDebitNeedsConfirm: PlainFixedExpense[];
  savingsGoals: PlainNamedSavingsGoal[];
  /** Per-goal balances ("" key = unallocated) — feeds the sweep
   *  dialog so already-funded goals can default-skip. */
  savingsBalanceByGoal: Record<string, number>;
};

type Tone = "danger" | "accent" | "success" | "warning";

const toneClasses: Record<
  Tone,
  { swatch: string; iconBg: string; rule: string }
> = {
  danger: {
    swatch: "bg-(--danger)/20",
    iconBg: "bg-(--danger)/40",
    rule: "border-(--danger)/30",
  },
  warning: {
    swatch: "bg-(--warning)/20",
    iconBg: "bg-(--warning)/40",
    rule: "border-(--warning)/30",
  },
  accent: {
    swatch: "bg-(--accent)/20",
    iconBg: "bg-(--accent)/40",
    rule: "border-(--accent)/30",
  },
  success: {
    swatch: "bg-(--success)/20",
    iconBg: "bg-(--success)/40",
    rule: "border-(--success)/30",
  },
};

export function ActionInboxCard({
  currency,
  locale,
  statusCounts,
  remainingFixedPaise,
  pendingSweep,
  shortfallHint,
  autoDebitNeedsConfirm,
  savingsGoals,
  savingsBalanceByGoal,
}: Props) {
  const queryClient = useQueryClient();
  const [sweepDialogOpen, setSweepDialogOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<number>(0);

  const sweepMutation = useMutation({
    mutationFn: (allocations: SweepAllocation[] | null) =>
      pendingSweep
        ? sweepMonthSurplusAction(pendingSweep, allocations ?? undefined)
        : Promise.resolve({
            ok: false as const,
            error: { code: "MISSING", message: "No sweep" },
          }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Swept to Savings");
      setSweepDialogOpen(false);
      setCelebrate((n) => n + 1);
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const coverMutation = useMutation({
    mutationFn: () =>
      shortfallHint
        ? coverMonthShortfallAction(shortfallHint.coverablePaise)
        : Promise.resolve({
            ok: false as const,
            error: { code: "MISSING", message: "No shortfall" },
          }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Covered from Savings");
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });

  const autoDebitMutation = useMutation({
    mutationFn: confirmAutoDebitAction,
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        `Confirmed ${res.data.confirmed} auto-debit${res.data.confirmed === 1 ? "" : "s"}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
      await queryClient.invalidateQueries({ queryKey: ["auto-debit"] });
    },
  });

  type Item = {
    key: string;
    tone: Tone;
    icon: typeof AlertTriangle;
    title: string;
    detail: string;
    action: React.ReactNode;
  };

  const items: Item[] = [];

  if (statusCounts.overdue > 0) {
    items.push({
      key: "overdue",
      tone: "danger",
      icon: AlertTriangle,
      title: `${statusCounts.overdue} overdue ${statusCounts.overdue === 1 ? "bill" : "bills"}`,
      detail: `${formatCurrency(remainingFixedPaise, currency, locale)} due this month`,
      action: (
        <Link
          href="/fixed"
          className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Review <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      ),
    });
  }

  if (autoDebitNeedsConfirm.length > 0) {
    const total = autoDebitNeedsConfirm.reduce((s, f) => s + f.amountPaise, 0);
    items.push({
      key: "autodebit",
      tone: "accent",
      icon: Zap,
      title: `${autoDebitNeedsConfirm.length} auto-debit${autoDebitNeedsConfirm.length === 1 ? "" : "s"} to confirm`,
      detail: `${formatCurrency(total, currency, locale)} should have hit your account`,
      action: (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={autoDebitMutation.isPending}
          onClick={() =>
            autoDebitMutation.mutate(autoDebitNeedsConfirm.map((f) => f.id))
          }
        >
          {autoDebitMutation.isPending ? "Confirming…" : "Confirm all"}
        </Button>
      ),
    });
  }

  if (shortfallHint) {
    const fullCover =
      shortfallHint.coverablePaise >= shortfallHint.shortfallPaise;
    items.push({
      key: "cover",
      tone: "warning",
      icon: HandCoins,
      title: `${formatCurrency(shortfallHint.shortfallPaise, currency, locale)} projected shortfall`,
      detail: fullCover
        ? "Savings can cover it"
        : `Savings can cover ${formatCurrency(shortfallHint.coverablePaise, currency, locale)} of it`,
      action: (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={coverMutation.isPending}
          onClick={() => coverMutation.mutate()}
        >
          {coverMutation.isPending ? "Covering…" : "Cover"}
        </Button>
      ),
    });
  }

  if (pendingSweep) {
    items.push({
      key: "sweep",
      tone: "success",
      icon: CalendarCheck,
      title: `${pendingSweep.monthLabel} surplus ready`,
      detail: `+${formatCurrency(pendingSweep.surplusPaise, currency, locale)} can move to Savings`,
      action: (
        <Button
          type="button"
          size="sm"
          disabled={sweepMutation.isPending}
          onClick={() => setSweepDialogOpen(true)}
        >
          {sweepMutation.isPending ? "Sweeping…" : "Sweep"}
        </Button>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <Confetti trigger={celebrate} />
      <CardHeader>
        <div>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            {items.length} {items.length === 1 ? "thing needs" : "things need"} your attention
          </CardDescription>
        </div>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          const tone = toneClasses[it.tone];
          return (
            <li
              key={it.key}
              className={cn(
                "flex flex-col gap-2 rounded-[var(--radius-input)] border p-3 sm:flex-row sm:items-center sm:gap-3",
                tone.rule,
                tone.swatch,
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    tone.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4 text-(--text)" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--text)">
                    {it.title}
                  </p>
                  <p className="truncate text-xs text-(--muted)">{it.detail}</p>
                </div>
              </div>
              <div className="flex shrink-0 justify-end pl-11 sm:pl-0">{it.action}</div>
            </li>
          );
        })}
      </ul>

      {pendingSweep ? (
        <SplitSweepDialog
          open={sweepDialogOpen}
          onOpenChange={setSweepDialogOpen}
          goals={savingsGoals}
          balanceByGoal={savingsBalanceByGoal}
          surplusPaise={pendingSweep.surplusPaise}
          monthLabel={pendingSweep.monthLabel}
          currency={currency}
          locale={locale}
          pending={sweepMutation.isPending}
          onConfirm={(allocations) => sweepMutation.mutate(allocations)}
        />
      ) : null}
    </Card>
  );
}
