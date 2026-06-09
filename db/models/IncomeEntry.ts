import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IncomeEntryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amountPaise: number;
  effectiveDate: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const incomeEntrySchema = new Schema<IncomeEntryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    effectiveDate: { type: Date, required: true },
    note: { type: String, default: null, maxlength: 280 },
  },
  { timestamps: true, collection: "income_entries" },
);

incomeEntrySchema.index({ userId: 1, effectiveDate: -1 });

export const IncomeEntry: Model<IncomeEntryDoc> =
  (models.IncomeEntry as Model<IncomeEntryDoc> | undefined) ??
  model<IncomeEntryDoc>("IncomeEntry", incomeEntrySchema);
