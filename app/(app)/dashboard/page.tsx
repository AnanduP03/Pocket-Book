import nextDynamic from "next/dynamic";
import { fetchDashboardCore } from "@/features/dashboard/queries";
import { FreeCashCard } from "@/features/dashboard/components/FreeCashCard";
import { RemainingCard } from "@/features/dashboard/components/RemainingCard";
import { BurnRateCard } from "@/features/dashboard/components/BurnRateCard";
import { SavingsCard } from "@/features/dashboard/components/SavingsCard";
import { IncomeAllocationCard } from "@/features/dashboard/components/IncomeAllocationCard";
import { ActionInboxCard } from "@/features/dashboard/components/ActionInboxCard";
import { SpendingClimatePill } from "@/features/dashboard/components/SpendingClimatePill";
import { UsagePromptsCard } from "@/features/dashboard/components/UsagePromptsCard";
import { DeferralExperimentCard } from "@/features/dashboard/components/DeferralExperimentCard";
import { SoftCapsCard } from "@/features/dashboard/components/SoftCapsCard";
import { DashboardPullToRefresh } from "@/features/dashboard/components/DashboardPullToRefresh";
import { MonthEndWrapUp } from "@/features/dashboard/components/MonthEndWrapUp";
import { FirstRunTour } from "@/features/dashboard/components/FirstRunTour";
import { Skeleton } from "@/components/ui/skeleton";
import { InView } from "@/components/ui/in-view";
import { formatCurrency } from "@/lib/format/money";

const CategoryBreakdown = nextDynamic(
  () =>
    import("@/features/dashboard/components/CategoryBreakdown").then(
      (m) => m.CategoryBreakdown,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full" /> },
);

const SpendingHeatmapCard = nextDynamic(
  () =>
    import("@/features/dashboard/components/SpendingHeatmapCard").then(
      (m) => m.SpendingHeatmapCard,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full" /> },
);

const TrajectoryCard = nextDynamic(
  () =>
    import("@/features/dashboard/components/TrajectoryCard").then(
      (m) => m.TrajectoryCard,
    ),
  { loading: () => <Skeleton className="h-[280px] w-full" /> },
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await fetchDashboardCore();

  const freeCashTrend = data.monthlyTotals.map((m) => m.freeCashPaise);
  const variableTrend = data.monthlyTotals.map((m) => m.variablePaise);

  return (
    <div className="flex flex-col gap-8 dashboard-pull">
      <DashboardPullToRefresh />
      <MonthEndWrapUp />
      <FirstRunTour />

      {/* Now zone — what's true right this moment. */}
      <section className="flex flex-col gap-4">
        <div className="rise-in" style={{ animationDelay: "0ms" }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                Pocketbook
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-(--text) sm:text-4xl">
                Dashboard
              </h1>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                Today
              </p>
              <p className="pb-amount tabular-nums text-base font-medium text-(--text)">
                {data.todaySpendPaise > 0
                  ? formatCurrency(data.todaySpendPaise, data.currency, data.locale)
                  : "Nothing yet"}
              </p>
            </div>
          </div>
        </div>

        <div className="rise-in" style={{ animationDelay: "30ms" }}>
          <SpendingClimatePill climate={data.spendingClimate} />
        </div>

        <div
          className="rise-in grid gap-4 lg:auto-rows-fr lg:grid-cols-3"
          style={{ animationDelay: "60ms" }}
        >
          <FreeCashCard
            currency={data.currency}
            locale={data.locale}
            freeCashPaise={data.freeCashPaise}
            remainingFixedPaise={data.remainingFixedPaise}
            trendValues={freeCashTrend}
            projectedRunsOutAtIso={data.projectedRunsOutAtIso}
            monthlyIncomePaise={data.monthlyIncomePaise}
            monthlyFixedPaise={data.monthlyFixedPaise}
            monthlyVariablePaise={data.monthlyVariablePaise}
          />
          <RemainingCard
            currency={data.currency}
            locale={data.locale}
            freeCashPaise={data.freeCashPaise}
            variablePaise={data.monthlyVariablePaise}
            avgVariablePaise={data.avgVariablePaise}
            trailingMonthsForAvg={data.trailingMonthsForAvg}
            trendValues={variableTrend}
          />
          <SavingsCard
            balance={data.savingsBalance}
            thisMonthDeltaPaise={data.savingsThisMonthDeltaPaise}
            currency={data.currency}
            locale={data.locale}
            goalAmountPaise={data.savingsGoalAmountPaise}
            goalTargetDate={data.savingsGoalTargetDate}
            monthlySavingsAvgPaise={data.monthlySavingsAvgPaise}
            goals={data.savingsGoals}
            balanceByGoal={
              new Map(
                Object.entries(data.savingsBalanceByGoal).map(([k, v]) => [
                  k === "" ? null : k,
                  v,
                ]),
              )
            }
          />
        </div>
      </section>

      {/* Action zone — things needing your attention. Inbox first
          (must-do), then the noticing cards (interesting-but-soft). */}
      <section className="flex flex-col gap-4">
        <div className="rise-in" style={{ animationDelay: "120ms" }}>
          <ActionInboxCard
            currency={data.currency}
            locale={data.locale}
            statusCounts={data.statusCounts}
            remainingFixedPaise={data.remainingFixedPaise}
            pendingSweep={data.pendingSweep}
            shortfallHint={data.shortfallHint}
            autoDebitNeedsConfirm={data.autoDebitNeedsConfirm}
            savingsGoals={data.savingsGoals}
            savingsBalanceByGoal={data.savingsBalanceByGoal}
          />
        </div>

        <div
          className="rise-in grid gap-4 lg:grid-cols-2"
          style={{ animationDelay: "150ms" }}
        >
          <UsagePromptsCard currency={data.currency} locale={data.locale} />
          <SoftCapsCard currency={data.currency} locale={data.locale} />
          <DeferralExperimentCard
            fixedHighlights={data.fixedHighlights}
            freeCashPaise={data.freeCashPaise}
            remainingFixedPaise={data.remainingFixedPaise}
            currency={data.currency}
            locale={data.locale}
          />
        </div>
      </section>

      {/* Shape-of-the-month zone — the slower, contextual cards. */}
      <section className="flex flex-col gap-4">
        <div
          className="rise-in grid gap-4 lg:auto-rows-fr lg:grid-cols-2"
          style={{ animationDelay: "180ms" }}
        >
          <IncomeAllocationCard
            currency={data.currency}
            locale={data.locale}
            incomePaise={data.monthlyIncomePaise}
            fixedPaise={data.monthlyFixedPaise}
            variablePaise={data.monthlyVariablePaise}
            freeCashPaise={data.freeCashPaise}
            pendingSweepPaise={data.pendingSweep?.surplusPaise ?? null}
          />
          <BurnRateCard
            currency={data.currency}
            locale={data.locale}
            daysElapsed={data.daysElapsed}
            daysInMonth={data.daysInMonth}
            variablePaise={data.monthlyVariablePaise}
          />
        </div>

        <div className="rise-in" style={{ animationDelay: "240ms" }}>
          <InView
            fallback={<Skeleton className="h-[280px] w-full" />}
            rootMargin="200px"
          >
            <TrajectoryCard
              monthlyTotals={data.monthlyTotals}
              currency={data.currency}
              locale={data.locale}
            />
          </InView>
        </div>
      </section>

      {/* Detail zone — heavy charts, lazy-loaded so first paint stays light. */}
      <section className="flex flex-col gap-4">
        <div className="rise-in" style={{ animationDelay: "300ms" }}>
          <InView
            fallback={<Skeleton className="h-[420px] w-full" />}
            rootMargin="200px"
          >
            <CategoryBreakdown
              currency={data.currency}
              locale={data.locale}
            />
          </InView>
        </div>

        <div className="rise-in" style={{ animationDelay: "360ms" }}>
          <InView
            fallback={<Skeleton className="h-[420px] w-full" />}
            rootMargin="200px"
          >
            <SpendingHeatmapCard
              categories={data.categories}
              currency={data.currency}
              locale={data.locale}
            />
          </InView>
        </div>
      </section>
    </div>
  );
}
