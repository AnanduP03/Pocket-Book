import { listIncomeEntries } from "@/db/repositories/income";
import { getSettings } from "@/db/repositories/settings";
import { IncomeListView } from "@/features/income/components/IncomeListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const user = await requireUser();
  const [entries, settings] = await Promise.all([
    listIncomeEntries(user.id),
    getSettings(user.id),
  ]);

  return (
    <IncomeListView
      initial={entries}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
