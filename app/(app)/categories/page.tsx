import { CategoryListView } from "@/features/categories/components/CategoryListView";
import { listCategories } from "@/db/repositories/categories";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await requireUser();
  const initial = await listCategories(user.id);
  return <CategoryListView initial={initial} />;
}
