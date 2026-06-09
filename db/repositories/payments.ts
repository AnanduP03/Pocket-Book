import "server-only";
import {
  ExpensePayment,
  type ExpensePaymentDoc,
} from "@/db/models/ExpensePayment";
import { connectDb } from "@/db/client";

export type PlainPayment = {
  id: string;
  fixedExpenseId: string;
  paidDate: Date;
  amountPaise: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<ExpensePaymentDoc, "_id" | "fixedExpenseId"> & {
  _id: { toString(): string };
  fixedExpenseId: { toString(): string };
};

function toPlain(p: Lean): PlainPayment {
  return {
    id: p._id.toString(),
    fixedExpenseId: p.fixedExpenseId.toString(),
    paidDate: p.paidDate,
    amountPaise: p.amountPaise,
    note: p.note,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function listPaymentsFor(
  userId: string,
  fixedExpenseId: string,
): Promise<PlainPayment[]> {
  await connectDb();
  const docs = await ExpensePayment.find({ userId, fixedExpenseId })
    .sort({ paidDate: -1, createdAt: -1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export async function listPaymentsForRange(
  userId: string,
  fixedExpenseIds: string[],
  start: Date,
  end: Date,
): Promise<PlainPayment[]> {
  if (fixedExpenseIds.length === 0) return [];
  await connectDb();
  const docs = await ExpensePayment.find({
    userId,
    fixedExpenseId: { $in: fixedExpenseIds },
    paidDate: { $gte: start, $lte: end },
  })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export type NewPaymentInput = {
  fixedExpenseId: string;
  paidDate: Date;
  amountPaise: number;
  note: string | null;
};

export async function createPayment(
  userId: string,
  input: NewPaymentInput,
): Promise<PlainPayment> {
  await connectDb();
  const created = await ExpensePayment.create({ ...input, userId });
  return toPlain(created.toObject() as unknown as Lean);
}

export async function deletePayment(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const res = await ExpensePayment.deleteOne({ _id: id, userId }).exec();
  return res.deletedCount === 1;
}

export async function getMostRecentPaymentFor(
  userId: string,
  fixedExpenseId: string,
): Promise<PlainPayment | null> {
  await connectDb();
  const doc = await ExpensePayment.findOne({ userId, fixedExpenseId })
    .sort({ paidDate: -1, createdAt: -1 })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}
