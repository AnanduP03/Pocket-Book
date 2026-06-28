import { Schema, model, models, type Model, type Types } from "mongoose";

export interface VariableExpenseDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  amountPaise: number;
  currency: string;
  categoryId: Types.ObjectId;
  note: string | null;
  /** Lightweight free-form tags ("guilt", "gift", "late-night", "needed").
   *  Used by the monthly reflection card to surface patterns. */
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const variableSchema = new Schema<VariableExpenseDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountPaise must be a positive integer",
      },
    },
    currency: { type: String, required: true, trim: true, minlength: 3, maxlength: 3 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    note: { type: String, default: null, maxlength: 280 },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: unknown[]) =>
          Array.isArray(arr) &&
          arr.length <= 6 &&
          arr.every(
            (t) => typeof t === "string" && t.length >= 1 && t.length <= 24,
          ),
        message: "Up to 6 tags, each 1–24 characters",
      },
    },
  },
  { timestamps: true, collection: "variable_expenses" },
);

variableSchema.index({ userId: 1, date: -1 });
variableSchema.index({ userId: 1, categoryId: 1 });
variableSchema.index({ userId: 1, tags: 1 });

export const VariableExpense: Model<VariableExpenseDoc> =
  (models.VariableExpense as Model<VariableExpenseDoc> | undefined) ??
  model<VariableExpenseDoc>("VariableExpense", variableSchema);
