import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ExpensePaymentDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fixedExpenseId: Types.ObjectId;
  paidDate: Date;
  amountPaise: number;
  note: string | null;
  /** "Did you use it this cycle?" recorded inline at mark-paid (or via
   *  the dashboard prompt). null = unknown / not asked yet, true / false
   *  feed the subscription-review deck. */
  usedThisCycle: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const expensePaymentSchema = new Schema<ExpensePaymentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fixedExpenseId: {
      type: Schema.Types.ObjectId,
      ref: "FixedExpense",
      required: true,
    },
    paidDate: { type: Date, required: true },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    note: { type: String, default: null, maxlength: 280 },
    usedThisCycle: { type: Boolean, default: null },
  },
  { timestamps: true, collection: "expense_payments" },
);

expensePaymentSchema.index({ userId: 1, fixedExpenseId: 1, paidDate: -1 });

export const ExpensePayment: Model<ExpensePaymentDoc> =
  (models.ExpensePayment as Model<ExpensePaymentDoc> | undefined) ??
  model<ExpensePaymentDoc>("ExpensePayment", expensePaymentSchema);
