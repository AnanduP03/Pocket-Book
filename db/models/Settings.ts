import { Schema, model, models, type Model, type Types } from "mongoose";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Legacy single-goal subdoc. Retained on the schema so existing user
 * documents keep loading; on read we migrate the value into `savingsGoals`
 * (see toPlain in db/repositories/settings.ts). New writes go to
 * `savingsGoals` only.
 */
export interface SavingsGoalLegacy {
  amountPaise: number;
  targetDate: Date;
}

/**
 * A named savings goal, allocated a fixed percentage of each sweep.
 *
 * `sharePct` values across a user's goals should sum to 100. Validation
 * is enforced in the zod input schema (server actions). The mongoose
 * subdoc allows any 0-100 individually.
 */
export interface SavingsGoal {
  id: string;
  name: string;
  amountPaise: number;
  targetDate: Date;
  sharePct: number;
}

export interface QuickPreset {
  id: string;
  label: string;
  amountPaise: number;
  categoryId: Types.ObjectId;
}

export interface SettingsDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  defaultCurrency: string;
  theme: ThemeMode;
  weekStart: 0 | 1;
  locale: string;
  /** Deprecated — read for migration, never written by the app. */
  savingsGoal: SavingsGoalLegacy | null;
  savingsGoals: SavingsGoal[];
  quickPresets: QuickPreset[];
  createdAt: Date;
  updatedAt: Date;
}

const savingsGoalLegacySubSchema = new Schema<SavingsGoalLegacy>(
  {
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    targetDate: { type: Date, required: true },
  },
  { _id: false },
);

const savingsGoalSubSchema = new Schema<SavingsGoal>(
  {
    id: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    targetDate: { type: Date, required: true },
    sharePct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const quickPresetSubSchema = new Schema<QuickPreset>(
  {
    id: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 24 },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { _id: false },
);

const settingsSchema = new Schema<SettingsDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    defaultCurrency: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
      default: "INR",
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      required: true,
      default: "system",
    },
    weekStart: { type: Number, enum: [0, 1], required: true, default: 1 },
    locale: { type: String, required: true, default: "en-IN", trim: true },
    savingsGoal: { type: savingsGoalLegacySubSchema, default: null },
    savingsGoals: {
      type: [savingsGoalSubSchema],
      default: [],
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length <= 12,
        message: "Up to 12 savings goals supported",
      },
    },
    quickPresets: {
      type: [quickPresetSubSchema],
      default: [],
      // Cap presets to keep the picker visually compact.
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length <= 6,
        message: "Up to 6 presets supported",
      },
    },
  },
  { timestamps: true, collection: "settings" },
);

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc> | undefined) ??
  model<SettingsDoc>("Settings", settingsSchema);
