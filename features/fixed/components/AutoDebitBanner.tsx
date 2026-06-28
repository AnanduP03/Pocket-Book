"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmAutoDebitAction, fetchAutoDebitNeedsConfirm } from "../actions";
import { formatCurrency } from "@/lib/format/money";
import type { PlainFixedExpense } from "@/db/repositories/fixed";

type Props = {
  pending: PlainFixedExpense[];
  currency: string;
  locale: string;
};

export function AutoDebitBanner({ pending, currency, locale }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
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

  if (pending.length === 0) return null;

  const total = pending.reduce((sum, f) => sum + f.amountPaise, 0);
  const single = pending.length === 1;

  return (
    <div className="rounded-[var(--radius-card)] border border-(--accent)/40 bg-(--accent)/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent)/40"
          >
            <Zap className="h-4 w-4 text-(--text)" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--text)">
              {single
                ? "Auto-debit to confirm"
                : `${pending.length} auto-debits to confirm`}
            </p>
            <p className="mt-0.5 text-xs text-(--muted)">
              {single
                ? `${pending[0]?.name ?? ""} · ${formatCurrency(total, currency, locale)} should have hit your account.`
                : `${formatCurrency(total, currency, locale)} should have hit your account.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(pending.map((f) => f.id))}
          className="shrink-0 self-stretch sm:self-start sm:w-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {single ? "Confirm" : "Confirm all"}
        </Button>
      </div>

      {!single ? (
        <ul className="mt-3 flex flex-col gap-1 pl-11 text-xs">
          {pending.slice(0, 5).map((f) => (
            <li key={f.id} className="flex items-baseline justify-between gap-3">
              <span className="truncate text-(--text)">{f.name}</span>
              <span className="shrink-0 tabular-nums text-(--muted)">
                {formatCurrency(f.amountPaise, currency, locale)}
              </span>
            </li>
          ))}
          {pending.length > 5 ? (
            <li className="text-(--muted)">+ {pending.length - 5} more</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export { fetchAutoDebitNeedsConfirm };
