import "server-only";
import {
  FixedExpense,
  type FixedExpenseDoc,
  type IntervalUnit,
} from "@/db/models/FixedExpense";
import { ExpensePayment } from "@/db/models/ExpensePayment";
import { connectDb } from "@/db/client";

export type PlainFixedExpense = {
  id: string;
  name: string;
  amountPaise: number;
  categoryId: string;
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
};

type Lean = Omit<FixedExpenseDoc, "_id" | "categoryId"> & {
  _id: { toString(): string };
  categoryId: { toString(): string };
};

function toPlain(d: Lean): PlainFixedExpense {
  return {
    id: d._id.toString(),
    name: d.name,
    amountPaise: d.amountPaise,
    categoryId: d.categoryId.toString(),
    isActive: d.isActive,
    isAutoDebit: d.isAutoDebit,
    startDate: d.startDate,
    intervalValue: d.intervalValue,
    intervalUnit: d.intervalUnit,
    endDate: d.endDate,
    lastPaidDate: d.lastPaidDate,
    note: d.note,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export type ListFixedOptions = { activeOnly?: boolean };

export async function listFixed(
  userId: string,
  opts: ListFixedOptions = {},
): Promise<PlainFixedExpense[]> {
  await connectDb();
  const filter: Record<string, unknown> = { userId };
  if (opts.activeOnly) filter.isActive = true;
  const docs = await FixedExpense.find(filter)
    .sort({ name: 1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export async function getFixedById(
  userId: string,
  id: string,
): Promise<PlainFixedExpense | null> {
  await connectDb();
  const doc = await FixedExpense.findOne({ _id: id, userId }).lean<Lean | null>().exec();
  return doc ? toPlain(doc) : null;
}

export type NewFixedInput = Omit<
  PlainFixedExpense,
  "id" | "createdAt" | "updatedAt" | "lastPaidDate"
> & {
  lastPaidDate?: Date | null;
};

export async function createFixed(
  userId: string,
  input: NewFixedInput,
): Promise<PlainFixedExpense> {
  await connectDb();
  const created = await FixedExpense.create({
    ...input,
    userId,
    lastPaidDate: input.lastPaidDate ?? null,
  });
  return toPlain(created.toObject() as unknown as Lean);
}

export type FixedPatch = Partial<Omit<NewFixedInput, "lastPaidDate">> & {
  lastPaidDate?: Date | null;
};

export async function updateFixed(
  userId: string,
  id: string,
  patch: FixedPatch,
): Promise<PlainFixedExpense | null> {
  await connectDb();
  const doc = await FixedExpense.findOneAndUpdate({ _id: id, userId }, patch, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}

export async function deleteFixed(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const session = await FixedExpense.startSession();
  try {
    let deleted = false;
    await session.withTransaction(async () => {
      const res = await FixedExpense.deleteOne(
        { _id: id, userId },
        { session },
      ).exec();
      if (res.deletedCount === 1) {
        await ExpensePayment.deleteMany(
          { fixedExpenseId: id, userId },
          { session },
        ).exec();
        deleted = true;
      }
    });
    return deleted;
  } finally {
    await session.endSession();
  }
}

export async function setLastPaidDate(
  userId: string,
  id: string,
  date: Date | null,
): Promise<PlainFixedExpense | null> {
  await connectDb();
  const doc = await FixedExpense.findOneAndUpdate(
    { _id: id, userId },
    { lastPaidDate: date },
    { returnDocument: "after" },
  )
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}
