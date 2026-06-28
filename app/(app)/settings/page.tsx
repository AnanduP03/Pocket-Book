import { getSettings } from "@/db/repositories/settings";
import { listCategories } from "@/db/repositories/categories";
import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { ExportPanel } from "@/features/settings/components/ExportPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, categories] = await Promise.all([
    getSettings(user.id),
    listCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Preferences"
          title="Settings"
          description="Tune the look, defaults, and starting day of your week. Changes save to your account and apply everywhere."
        />
      </div>

      <SettingsForm initial={settings} categories={categories} />

      <div className="rise-in" style={{ animationDelay: "120ms" }}>
        <ExportPanel />
      </div>
    </div>
  );
}
