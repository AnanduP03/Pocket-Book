"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  deletePaymentAction,
  listPaymentsAction,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { PlainPayment } from "@/db/repositories/payments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixed: PlainFixedExpense | null;
  currency: string;
  locale: string;
};

export function FixedHistorySheet({
  open,
  onOpenChange,
  fixed,
  currency,
  locale,
}: Props) {
  const queryClient = useQueryClient();
  const fixedId = fixed?.id;

  const { data = [], isLoading } = useQuery<PlainPayment[]>({
    queryKey: ["payments", fixedId],
    queryFn: () => (fixedId ? listPaymentsAction(fixedId) : Promise.resolve([])),
    enabled: Boolean(open && fixedId),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ paymentId, fixedExpenseId }: { paymentId: string; fixedExpenseId: string }) =>
      deletePaymentAction(paymentId, fixedExpenseId),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Payment removed");
      await queryClient.invalidateQueries({ queryKey: ["payments", fixedId] });
      await queryClient.invalidateQueries({ queryKey: ["fixed"] });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{fixed ? `${fixed.name} — payments` : "History"}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <p className="text-sm text-(--muted)">Loading…</p>
        ) : data.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
            <p className="text-sm text-(--muted)">No payments recorded yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums text-(--text)">
                    {formatCurrency(p.amountPaise, currency, locale)}
                  </p>
                  <p className="text-xs text-(--muted)">
                    {formatDate(new Date(p.paidDate), locale)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete payment"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate({
                      paymentId: p.id,
                      fixedExpenseId: p.fixedExpenseId,
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
