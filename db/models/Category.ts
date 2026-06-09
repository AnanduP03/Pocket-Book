import { Schema, model, models, type Model, type Types } from "mongoose";
import { PALETTE_HEXES } from "@/lib/theme/palette";

export type CategoryType = "Fixed" | "Variable";

export interface CategoryDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    type: { type: String, enum: ["Fixed", "Variable"], required: true },
    icon: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    color: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) =>
          PALETTE_HEXES.includes(v as (typeof PALETTE_HEXES)[number]),
        message: "color must be one of the pastel palette",
      },
    },
  },
  { timestamps: true, collection: "categories" },
);

categorySchema.index(
  { userId: 1, name: 1, type: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
categorySchema.index({ userId: 1, type: 1 });

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc> | undefined) ??
  model<CategoryDoc>("Category", categorySchema);
