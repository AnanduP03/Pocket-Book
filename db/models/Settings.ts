import { Schema, model, models, type Model, type Types } from "mongoose";

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  defaultCurrency: string;
  theme: ThemeMode;
  weekStart: 0 | 1;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true, collection: "settings" },
);

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc> | undefined) ??
  model<SettingsDoc>("Settings", settingsSchema);
