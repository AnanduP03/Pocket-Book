import { listCategories } from "@/db/repositories/categories";
import { listFixed } from "@/db/repositories/fixed";
import { getSettings } from "@/db/repositories/settings";
import { fetchAutoDebitNeedsConfirm } from "@/features/fixed/actions";
import { FixedListView } from "@/features/fixed/components/FixedListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function FixedPage() {
  const user = await requireUser();
  const [items, autoDebit, categories, settings] = await Promise.all([
    listFixed(user.id),
    fetchAutoDebitNeedsConfirm(),
    listCategories(user.id),
    getSettings(user.id),
  ]);

  return (
    <FixedListView
      initial={items}
      initialAutoDebit={autoDebit}
      categories={categories}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
