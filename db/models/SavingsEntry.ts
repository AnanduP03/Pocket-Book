import { Schema, model, models, type Model, type Types } from "mongoose";

export type SavingsEntryKind =
  | "manual_deposit"
  | "manual_withdrawal"
  | "month_surplus"
  | "month_cover";

export interface SavingsEntryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amountPaise: number; // signed: positive = credit, negative = debit
  kind: SavingsEntryKind;
  effectiveDate: Date;
  note: string | null;
  /** Optional named-goal allocation. Null = general (legacy) entry. */
  goalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const savingsSchema = new Schema<SavingsEntryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v !== 0,
        message: "amountPaise must be a non-zero integer",
      },
    },
    kind: {
      type: String,
      enum: [
        "manual_deposit",
        "manual_withdrawal",
        "month_surplus",
        "month_cover",
      ],
      required: true,
    },
    effectiveDate: { type: Date, required: true },
    note: { type: String, default: null, maxlength: 280 },
    goalId: { type: String, default: null, maxlength: 40 },
  },
  { timestamps: true, collection: "savings_entries" },
);

savingsSchema.index({ userId: 1, effectiveDate: -1 });
savingsSchema.index({ userId: 1, kind: 1, effectiveDate: 1 });
savingsSchema.index({ userId: 1, goalId: 1, effectiveDate: 1 });

export const SavingsEntry: Model<SavingsEntryDoc> =
  (models.SavingsEntry as Model<SavingsEntryDoc> | undefined) ??
  model<SavingsEntryDoc>("SavingsEntry", savingsSchema);
