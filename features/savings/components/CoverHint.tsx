"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandCoins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  coverMonthShortfallAction,
  type ShortfallHint,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  hint: ShortfallHint | null;
  currency: string;
  locale: string;
};

export function CoverHint({ hint, currency, locale }: Props) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      hint
        ? coverMonthShortfallAction(hint.coverablePaise)
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

  if (!hint || dismissed) return null;
  const fullCover = hint.coverablePaise >= hint.shortfallPaise;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-(--accent)/40 bg-(--accent)/10 p-3 text-xs">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent)/40"
      >
        <HandCoins className="h-3.5 w-3.5 text-(--text)" />
      </span>
      <p className="min-w-0 flex-1 text-(--text)">
        Projected{" "}
        <span className="font-medium tabular-nums text-(--danger)">
          −{formatCurrency(hint.shortfallPaise, currency, locale)}
        </span>{" "}
        this month.{" "}
        {fullCover
          ? "Savings can cover it."
          : `Savings can cover ${formatCurrency(hint.coverablePaise, currency, locale)} of it.`}
      </p>
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
        {mutation.isPending ? "Covering…" : "Cover from savings"}
      </Button>
    </div>
  );
}
