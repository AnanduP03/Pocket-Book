import { Schema, model, models, type Model, type Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  },
  { timestamps: true, collection: "users" },
);

userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ??
  model<UserDoc>("User", userSchema);
