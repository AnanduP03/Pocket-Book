import { listCategories } from "@/db/repositories/categories";
import { listVariableWithCount, variableSummary } from "@/db/repositories/variable";
import { getSettings } from "@/db/repositories/settings";
import { VariableListView } from "@/features/variable/components/VariableListView";
import { requireUser } from "@/lib/auth/server";
import { startOfMonthUtc, endOfMonthUtc } from "@/lib/format/date";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function VariablePage() {
  const user = await requireUser();
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const monthEnd = endOfMonthUtc(now);

  const [categories, page, settings, summary] = await Promise.all([
    listCategories(user.id),
    listVariableWithCount(user.id, {
      start: monthStart,
      end: monthEnd,
      limit: PAGE_SIZE,
      skip: 0,
    }),
    getSettings(user.id),
    variableSummary(user.id, now),
  ]);

  return (
    <VariableListView
      initial={{
        items: page.items,
        total: page.total,
        page: 1,
        pageSize: PAGE_SIZE,
        monthTotalPaise: summary.monthTotalPaise,
        todayTotalPaise: summary.todayTotalPaise,
        todayCount: summary.todayCount,
      }}
      initialFilterStart={monthStart}
      initialFilterEnd={monthEnd}
      categories={categories}
      defaultCurrency={settings.defaultCurrency}
      defaultLocale={settings.locale}
    />
  );
}
