"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sweepMonthSurplusAction,
  type PendingSweep,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  pending: PendingSweep | null;
  currency: string;
  locale: string;
};

export function SweepBanner({ pending, currency, locale }: Props) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      pending
        ? sweepMonthSurplusAction(pending)
        : Promise.resolve({
            ok: false as const,
            error: { code: "MISSING", message: "No pending sweep" },
          }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Swept to Savings");
      await queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });

  if (!pending || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--success)/40 bg-(--success)/15 p-4">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--success)/40"
      >
        <CalendarCheck className="h-4 w-4 text-(--text)" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-(--text)">
          {pending.monthLabel} closed with a surplus
        </p>
        <p className="mt-0.5 text-xs text-(--muted)">
          +{formatCurrency(pending.surplusPaise, currency, locale)} can move into
          Savings.
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Skip"
        onClick={() => setDismissed(true)}
        disabled={mutation.isPending}
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        {mutation.isPending ? "Sweeping…" : "Sweep"}
      </Button>
    </div>
  );
}
