import "server-only";
import bcrypt from "bcryptjs";
import { User, type UserDoc } from "@/db/models/User";
import { connectDb } from "@/db/client";

export type PlainUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<UserDoc, "_id"> & { _id: { toString(): string } };

function toPlain(u: Lean): PlainUser {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

const BCRYPT_ROUNDS = 12;

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
};

export async function createUser(input: CreateUserInput): Promise<PlainUser> {
  await connectDb();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const created = await User.create({
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash,
  });
  return toPlain(created.toObject() as unknown as Lean);
}

export async function findUserByEmail(email: string): Promise<PlainUser | null> {
  await connectDb();
  const doc = await User.findOne({ email: email.trim().toLowerCase() })
    .collation({ locale: "en", strength: 2 })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}

export async function findUserById(id: string): Promise<PlainUser | null> {
  await connectDb();
  const doc = await User.findById(id).lean<Lean | null>().exec();
  return doc ? toPlain(doc) : null;
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function updatePassword(
  id: string,
  newPassword: string,
): Promise<boolean> {
  await connectDb();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const res = await User.updateOne({ _id: id }, { passwordHash }).exec();
  return res.modifiedCount === 1;
}

export async function updateName(
  id: string,
  name: string,
): Promise<boolean> {
  await connectDb();
  const res = await User.updateOne({ _id: id }, { name: name.trim() }).exec();
  return res.modifiedCount === 1;
}

export async function deleteUser(id: string): Promise<boolean> {
  await connectDb();
  const res = await User.deleteOne({ _id: id }).exec();
  return res.deletedCount === 1;
}

export async function countUsers(): Promise<number> {
  await connectDb();
  return User.countDocuments().exec();
}
