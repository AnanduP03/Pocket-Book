import { Schema, model, models, type Model, type Types } from "mongoose";

export type IntervalUnit = "day" | "week" | "month" | "year";

export interface FixedExpenseDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  amountPaise: number;
  categoryId: Types.ObjectId;
  isActive: boolean;
  isAutoDebit: boolean;
  startDate: Date;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  endDate: Date | null;
  lastPaidDate: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const fixedExpenseSchema = new Schema<FixedExpenseDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    isActive: { type: Boolean, required: true, default: true },
    isAutoDebit: { type: Boolean, required: true, default: false },
    startDate: { type: Date, required: true },
    intervalValue: {
      type: Number,
      required: true,
      default: 1,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 1,
        message: "intervalValue must be a positive integer",
      },
    },
    intervalUnit: {
      type: String,
      required: true,
      enum: ["day", "week", "month", "year"],
    },
    endDate: { type: Date, default: null },
    lastPaidDate: { type: Date, default: null },
    note: { type: String, default: null, maxlength: 280 },
  },
  { timestamps: true, collection: "fixed_expenses" },
);

fixedExpenseSchema.index({ userId: 1, categoryId: 1 });
fixedExpenseSchema.index({ userId: 1, isActive: 1 });
fixedExpenseSchema.index({ userId: 1, lastPaidDate: 1 });

fixedExpenseSchema.pre("validate", function (this: FixedExpenseDoc) {
  if (this.endDate && this.endDate.getTime() < this.startDate.getTime()) {
    throw new Error("endDate must be on or after startDate");
  }
});

export const FixedExpense: Model<FixedExpenseDoc> =
  (models.FixedExpense as Model<FixedExpenseDoc> | undefined) ??
  model<FixedExpenseDoc>("FixedExpense", fixedExpenseSchema);
