"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, HelpCircle, X } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchPendingUsagePrompts,
  setPaymentUsageAction,
} from "@/features/fixed/actions";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  currency: string;
  locale: string;
};

/**
 * Quiet dashboard card asking the user whether they used each of their
 * recent recurring payments. Each answer is recorded against the payment
 * (yes/no) and feeds the subscription review deck. The card auto-hides
 * once nothing pending in the last 14 days.
 */
export function UsagePromptsCard({ currency, locale }: Props) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["fixed", "usage-prompts"],
    queryFn: fetchPendingUsagePrompts,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, used }: { id: string; used: boolean }) =>
      setPaymentUsageAction(id, used),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fixed", "usage-prompts"] });
    },
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error.message);
    },
  });

  if (data.length === 0) return null;

  // Show at most 3 prompts at a time to keep the card calm.
  const visible = data.slice(0, 3);

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <HelpCircle className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Did you use these?</CardTitle>
            <CardDescription>
              Quick yes/no — feeds the quarterly subscription review.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {visible.map(({ payment, fixed }) => (
          <li
            key={payment.id}
            className="flex items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text)">
                {fixed.name}
              </p>
              <p className="text-[11px] text-(--muted)">
                {formatCurrency(payment.amountPaise, currency, locale)} ·{" "}
                {new Date(payment.paidDate).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Didn't use this"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ id: payment.id, used: false })
              }
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              aria-label="Used this"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ id: payment.id, used: true })
              }
            >
              <Check className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
