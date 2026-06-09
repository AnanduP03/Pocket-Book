import { getSettings } from "@/db/repositories/settings";
import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
        Settings
      </h1>

      <SettingsForm initial={settings} />
    </div>
  );
}
