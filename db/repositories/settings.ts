import "server-only";
import {
  Settings,
  type SettingsDoc,
  type ThemeMode,
} from "@/db/models/Settings";
import { connectDb } from "@/db/client";

export type PlainSavingsGoal = {
  amountPaise: number;
  targetDate: Date;
};

/** A named savings goal — extends the legacy single-goal shape with id /
 *  name / share. */
export type PlainNamedSavingsGoal = PlainSavingsGoal & {
  id: string;
  name: string;
  sharePct: number;
};

export type PlainQuickPreset = {
  id: string;
  label: string;
  amountPaise: number;
  categoryId: string;
};

export type PlainSettings = {
  defaultCurrency: string;
  theme: ThemeMode;
  weekStart: 0 | 1;
  locale: string;
  /** Derived: the first named goal (or legacy single goal) for callers that
   *  haven't been updated yet. New code should use `savingsGoals`. */
  savingsGoal: PlainSavingsGoal | null;
  savingsGoals: PlainNamedSavingsGoal[];
  quickPresets: PlainQuickPreset[];
  updatedAt: Date;
};

function genGoalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateGoals(d: SettingsDoc): PlainNamedSavingsGoal[] {
  // Prefer the new array. Fall back to wrapping the legacy single goal as
  // a single-entry array named "General" with full share. Idempotent: once
  // the array is populated, the legacy field is ignored.
  if (Array.isArray(d.savingsGoals) && d.savingsGoals.length > 0) {
    return d.savingsGoals.map((g) => ({
      id: g.id,
      name: g.name,
      amountPaise: g.amountPaise,
      targetDate: g.targetDate,
      sharePct: g.sharePct,
    }));
  }
  if (d.savingsGoal) {
    return [
      {
        id: genGoalId(),
        name: "General",
        amountPaise: d.savingsGoal.amountPaise,
        targetDate: d.savingsGoal.targetDate,
        sharePct: 100,
      },
    ];
  }
  return [];
}

function toPlain(d: SettingsDoc): PlainSettings {
  const goals = migrateGoals(d);
  const firstGoal = goals[0]
    ? {
        amountPaise: goals[0].amountPaise,
        targetDate: goals[0].targetDate,
      }
    : null;
  return {
    defaultCurrency: d.defaultCurrency,
    theme: d.theme,
    weekStart: d.weekStart,
    locale: d.locale,
    savingsGoal: firstGoal,
    savingsGoals: goals,
    quickPresets: Array.isArray(d.quickPresets)
      ? d.quickPresets.map((p) => ({
          id: p.id,
          label: p.label,
          amountPaise: p.amountPaise,
          categoryId: p.categoryId.toString(),
        }))
      : [],
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

  // Strip the derived savingsGoal from the patch — only savingsGoals is
  // persisted. If the caller explicitly set savingsGoals, we also
  // unset the legacy field so the document is clean.
  const { savingsGoal: _legacy, savingsGoals, ...rest } = patch;
  const update: Record<string, unknown> = { ...rest };
  if (savingsGoals !== undefined) {
    update.savingsGoals = savingsGoals;
    update.savingsGoal = null;
  }

  const doc = await Settings.findOneAndUpdate({ userId }, update, {
    returnDocument: "after",
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  })
    .lean<SettingsDoc>()
    .exec();
  return toPlain(doc);
}
