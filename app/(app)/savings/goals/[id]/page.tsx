import { notFound } from "next/navigation";
import {
  getSavingsBalanceByGoal,
  listSavingsForGoal,
} from "@/db/repositories/savings";
import { getSettings } from "@/db/repositories/settings";
import { GoalDetailView } from "@/features/savings/components/GoalDetailView";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [settings, byGoal, entries] = await Promise.all([
    getSettings(user.id),
    getSavingsBalanceByGoal(user.id),
    listSavingsForGoal(user.id, id),
  ]);

  const goal = settings.savingsGoals.find((g) => g.id === id);
  if (!goal) notFound();

  const currentPaise = byGoal.get(id) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Goal"
          title={goal.name}
          description={`Target ${goal.amountPaise.toLocaleString(settings.locale)} paise · share ${Math.round(goal.sharePct)}% of sweeps`}
        />
      </div>

      <GoalDetailView
        goal={goal}
        currentPaise={currentPaise}
        entries={entries}
        currency={settings.defaultCurrency}
        locale={settings.locale}
      />
    </div>
  );
}
