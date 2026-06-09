import { listCategories } from "@/db/repositories/categories";
import { listVariableWithCount } from "@/db/repositories/variable";
import { getSettings } from "@/db/repositories/settings";
import { VariableListView } from "@/features/variable/components/VariableListView";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function VariablePage() {
  const user = await requireUser();
  const [categories, page, settings] = await Promise.all([
    listCategories(user.id),
    listVariableWithCount(user.id, { limit: PAGE_SIZE, skip: 0 }),
    getSettings(user.id),
  ]);

  return (
    <VariableListView
      initial={{
        items: page.items,
        total: page.total,
        page: 1,
        pageSize: PAGE_SIZE,
      }}
      categories={categories}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
