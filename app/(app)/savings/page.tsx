import {
  getSavingsBalance,
  getSavingsBalanceByGoal,
  listSavings,
} from "@/db/repositories/savings";
import { getSettings } from "@/db/repositories/settings";
import { SavingsListView } from "@/features/savings/components/SavingsListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const user = await requireUser();
  const [entries, balance, balanceByGoalMap, settings] = await Promise.all([
    listSavings(user.id),
    getSavingsBalance(user.id),
    getSavingsBalanceByGoal(user.id),
    getSettings(user.id),
  ]);

  // Mongoose Map can't cross the client boundary as-is; serialize the
  // null key as "" so the client knows it's the unallocated bucket.
  const balanceByGoal: Record<string, number> = {};
  for (const [k, v] of balanceByGoalMap) balanceByGoal[k ?? ""] = v;

  return (
    <SavingsListView
      initialEntries={entries}
      initialBalance={balance}
      initialBalanceByGoal={balanceByGoal}
      goals={settings.savingsGoals}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
