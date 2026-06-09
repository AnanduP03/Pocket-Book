import nextDynamic from "next/dynamic";
import { fetchDashboard } from "@/features/dashboard/queries";
import { FreeCashCard } from "@/features/dashboard/components/FreeCashCard";
import { BurnRateCard } from "@/features/dashboard/components/BurnRateCard";
import { SavingsCard } from "@/features/dashboard/components/SavingsCard";
import { FixedStatusGrid } from "@/features/dashboard/components/FixedStatusGrid";
import { RecentVariableStrip } from "@/features/dashboard/components/RecentVariableStrip";
import { AutoDebitBanner } from "@/features/fixed/components/AutoDebitBanner";
import { SweepBanner } from "@/features/savings/components/SweepBanner";
import { CoverHint } from "@/features/savings/components/CoverHint";
import { Skeleton } from "@/components/ui/skeleton";
import { InView } from "@/components/ui/in-view";

const CategoryBreakdown = nextDynamic(
  () =>
    import("@/features/dashboard/components/CategoryBreakdown").then(
      (m) => m.CategoryBreakdown,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full" /> },
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await fetchDashboard();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
        Dashboard
      </h1>

      <SweepBanner
        pending={data.pendingSweep}
        currency={data.currency}
        locale={data.locale}
      />

      <AutoDebitBanner
        pending={data.autoDebitNeedsConfirm}
        currency={data.currency}
        locale={data.locale}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FreeCashCard
          currency={data.currency}
          locale={data.locale}
          freeCashPaise={data.freeCashPaise}
          incomePaise={data.monthlyIncomePaise}
          fixedPaise={data.monthlyFixedPaise}
          variablePaise={data.monthlyVariablePaise}
        />
        <BurnRateCard
          currency={data.currency}
          locale={data.locale}
          daysElapsed={data.daysElapsed}
          daysInMonth={data.daysInMonth}
          variablePaise={data.monthlyVariablePaise}
          projectedFreeCashPaise={data.projectedEndOfMonthFreeCashPaise}
        />
      </div>

      <CoverHint
        hint={data.shortfallHint}
        currency={data.currency}
        locale={data.locale}
      />

      <SavingsCard
        balance={data.savingsBalance}
        currency={data.currency}
        locale={data.locale}
      />

      <InView
        fallback={<Skeleton className="h-[420px] w-full" />}
        rootMargin="200px"
      >
        <CategoryBreakdown
          monthlyBreakdowns={data.monthlyBreakdowns}
          currency={data.currency}
          locale={data.locale}
        />
      </InView>

      <div className="grid gap-4 lg:grid-cols-2">
        <FixedStatusGrid
          highlights={data.fixedHighlights}
          counts={data.statusCounts}
          categories={data.categories}
          currency={data.currency}
          locale={data.locale}
        />
        <RecentVariableStrip
          items={data.recentVariable}
          categories={data.categories}
          currency={data.currency}
          locale={data.locale}
        />
      </div>
    </div>
  );
}
