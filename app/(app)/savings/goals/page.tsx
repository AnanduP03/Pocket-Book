import { getSettings } from "@/db/repositories/settings";
import { getSavingsBalance } from "@/db/repositories/savings";
import { SavingsGoalsView } from "@/features/savings/components/SavingsGoalsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SavingsGoalsPage() {
  const user = await requireUser();
  const [settings, balance] = await Promise.all([
    getSettings(user.id),
    getSavingsBalance(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Savings"
          title="Goals"
          description="Name what you're saving for. Sweeps split between goals according to the share you set — they should add up to 100%."
        />
      </div>

      <SavingsGoalsView
        initialGoals={settings.savingsGoals}
        currency={settings.defaultCurrency}
        locale={settings.locale}
        currentBalancePaise={balance}
      />
    </div>
  );
}
