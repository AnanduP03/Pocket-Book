import "server-only";
import { IncomeEntry, type IncomeEntryDoc } from "@/db/models/IncomeEntry";
import { connectDb } from "@/db/client";

export type PlainIncomeEntry = {
  id: string;
  amountPaise: number;
  effectiveDate: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<IncomeEntryDoc, "_id"> & { _id: { toString(): string } };

function toPlain(e: Lean): PlainIncomeEntry {
  return {
    id: e._id.toString(),
    amountPaise: e.amountPaise,
    effectiveDate: e.effectiveDate,
    note: e.note,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function listIncomeEntries(
  userId: string,
): Promise<PlainIncomeEntry[]> {
  await connectDb();
  const docs = await IncomeEntry.find({ userId })
    .sort({ effectiveDate: -1, createdAt: -1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export type NewIncomeInput = {
  amountPaise: number;
  effectiveDate: Date;
  note: string | null;
};

export async function createIncome(
  userId: string,
  input: NewIncomeInput,
): Promise<PlainIncomeEntry> {
  await connectDb();
  const created = await IncomeEntry.create({ ...input, userId });
  return toPlain(created.toObject() as unknown as Lean);
}

export type IncomePatch = Partial<NewIncomeInput>;

export async function updateIncome(
  userId: string,
  id: string,
  patch: IncomePatch,
): Promise<PlainIncomeEntry | null> {
  await connectDb();
  const doc = await IncomeEntry.findOneAndUpdate({ _id: id, userId }, patch, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}

export async function deleteIncome(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const res = await IncomeEntry.deleteOne({ _id: id, userId }).exec();
  return res.deletedCount === 1;
}

export async function incomeForMonthEnd(
  userId: string,
  monthEnd: Date,
): Promise<PlainIncomeEntry | null> {
  await connectDb();
  const doc = await IncomeEntry.findOne({
    userId,
    effectiveDate: { $lte: monthEnd },
  })
    .sort({ effectiveDate: -1, createdAt: -1 })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}
