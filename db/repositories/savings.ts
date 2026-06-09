import "server-only";
import mongoose from "mongoose";
import {
  SavingsEntry,
  type SavingsEntryDoc,
  type SavingsEntryKind,
} from "@/db/models/SavingsEntry";
import { connectDb } from "@/db/client";

export type PlainSavingsEntry = {
  id: string;
  amountPaise: number;
  kind: SavingsEntryKind;
  effectiveDate: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<SavingsEntryDoc, "_id"> & { _id: { toString(): string } };

function toPlain(d: Lean): PlainSavingsEntry {
  return {
    id: d._id.toString(),
    amountPaise: d.amountPaise,
    kind: d.kind,
    effectiveDate: d.effectiveDate,
    note: d.note,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

export async function listSavings(
  userId: string,
): Promise<PlainSavingsEntry[]> {
  await connectDb();
  const docs = await SavingsEntry.find({ userId })
    .sort({ effectiveDate: -1, createdAt: -1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export async function getSavingsBalance(userId: string): Promise<number> {
  await connectDb();
  const result = await SavingsEntry.aggregate<{ total: number }>([
    { $match: { userId: toObjectId(userId) } },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } },
  ]).exec();
  return result[0]?.total ?? 0;
}

export type NewSavingsInput = {
  amountPaise: number;
  kind: SavingsEntryKind;
  effectiveDate: Date;
  note: string | null;
};

export async function createSavings(
  userId: string,
  input: NewSavingsInput,
): Promise<PlainSavingsEntry> {
  await connectDb();
  const created = await SavingsEntry.create({ ...input, userId });
  return toPlain(created.toObject() as unknown as Lean);
}

export async function deleteSavings(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const res = await SavingsEntry.deleteOne({ _id: id, userId }).exec();
  return res.deletedCount === 1;
}

export async function hasMonthSurplus(
  userId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<boolean> {
  await connectDb();
  const count = await SavingsEntry.countDocuments({
    userId,
    kind: "month_surplus",
    effectiveDate: { $gte: monthStart, $lte: monthEnd },
  }).exec();
  return count > 0;
}

export async function hasMonthCover(
  userId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<boolean> {
  await connectDb();
  const count = await SavingsEntry.countDocuments({
    userId,
    kind: "month_cover",
    effectiveDate: { $gte: monthStart, $lte: monthEnd },
  }).exec();
  return count > 0;
}

export async function sumSavingsInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<number> {
  await connectDb();
  const result = await SavingsEntry.aggregate<{ total: number }>([
    {
      $match: {
        userId: toObjectId(userId),
        effectiveDate: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } },
  ]).exec();
  return result[0]?.total ?? 0;
}
