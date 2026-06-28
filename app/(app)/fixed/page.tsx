import { listCategories } from "@/db/repositories/categories";
import { listFixed } from "@/db/repositories/fixed";
import { getSettings } from "@/db/repositories/settings";
import {
  fetchAutoDebitNeedsConfirm,
  fetchFixedMonthPayments,
} from "@/features/fixed/actions";
import { FixedListView } from "@/features/fixed/components/FixedListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function FixedPage() {
  const user = await requireUser();
  const items = await listFixed(user.id);
  const [autoDebit, categories, settings, monthPayments] = await Promise.all([
    fetchAutoDebitNeedsConfirm(),
    listCategories(user.id),
    getSettings(user.id),
    fetchFixedMonthPayments(items.map((f) => f.id)),
  ]);

  return (
    <FixedListView
      initial={items}
      initialAutoDebit={autoDebit}
      initialMonthPayments={monthPayments}
      categories={categories}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
