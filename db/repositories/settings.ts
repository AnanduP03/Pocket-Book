import "server-only";
import { Settings, type SettingsDoc, type ThemeMode } from "@/db/models/Settings";
import { connectDb } from "@/db/client";

export type PlainSettings = {
  defaultCurrency: string;
  theme: ThemeMode;
  weekStart: 0 | 1;
  locale: string;
  updatedAt: Date;
};

function toPlain(d: SettingsDoc): PlainSettings {
  return {
    defaultCurrency: d.defaultCurrency,
    theme: d.theme,
    weekStart: d.weekStart,
    locale: d.locale,
    updatedAt: d.updatedAt,
  };
}

export async function getSettings(userId: string): Promise<PlainSettings> {
  await connectDb();
  const doc = await Settings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  )
    .lean<SettingsDoc>()
    .exec();
  return toPlain(doc);
}

export type SettingsPatch = Partial<Omit<PlainSettings, "updatedAt">>;

export async function updateSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<PlainSettings> {
  await connectDb();
  const doc = await Settings.findOneAndUpdate({ userId }, patch, {
    returnDocument: "after",
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  })
    .lean<SettingsDoc>()
    .exec();
  return toPlain(doc);
}
