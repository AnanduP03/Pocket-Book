import {
  getSavingsBalance,
  listSavings,
} from "@/db/repositories/savings";
import { getSettings } from "@/db/repositories/settings";
import { SavingsListView } from "@/features/savings/components/SavingsListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const user = await requireUser();
  const [entries, balance, settings] = await Promise.all([
    listSavings(user.id),
    getSavingsBalance(user.id),
    getSettings(user.id),
  ]);

  return (
    <SavingsListView
      initialEntries={entries}
      initialBalance={balance}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
