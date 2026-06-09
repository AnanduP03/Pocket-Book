import Link from "next/link";
import { ArrowRight, PiggyBank } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/money";

type Props = {
  balance: number;
  currency: string;
  locale: string;
};

export function SavingsCard({ balance, currency, locale }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
          >
            <PiggyBank className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <CardTitle>Savings</CardTitle>
        </div>
        <Link
          href="/savings"
          className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Manage <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </CardHeader>
      <p
        className={
          balance >= 0
            ? "tabular-nums text-3xl font-semibold tracking-tight text-(--text)"
            : "tabular-nums text-3xl font-semibold tracking-tight text-(--danger)"
        }
      >
        {formatCurrency(balance, currency, locale)}
      </p>
    </Card>
  );
}

