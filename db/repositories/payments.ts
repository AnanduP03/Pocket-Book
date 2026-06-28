import "server-only";
import {
  ExpensePayment,
  type ExpensePaymentDoc,
} from "@/db/models/ExpensePayment";
import { FixedExpense } from "@/db/models/FixedExpense";
import { connectDb } from "@/db/client";

export type PlainPayment = {
  id: string;
  fixedExpenseId: string;
  paidDate: Date;
  amountPaise: number;
  note: string | null;
  usedThisCycle: boolean | null;
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
    usedThisCycle: p.usedThisCycle ?? null,
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

export async function listAllPayments(userId: string): Promise<PlainPayment[]> {
  await connectDb();
  const docs = await ExpensePayment.find({ userId })
    .sort({ paidDate: -1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export type NewPaymentInput = {
  fixedExpenseId: string;
  paidDate: Date;
  amountPaise: number;
  note: string | null;
  usedThisCycle?: boolean | null;
};

export async function createPayment(
  userId: string,
  input: NewPaymentInput,
): Promise<PlainPayment> {
  await connectDb();
  const created = await ExpensePayment.create({
    ...input,
    usedThisCycle: input.usedThisCycle ?? null,
    userId,
  });
  return toPlain(created.toObject() as unknown as Lean);
}

/**
 * Update a single payment's usage flag. Used by the dashboard prompt
 * "Did you use Netflix this cycle?" — the answer accumulates per payment
 * for the subscription-review deck to read later.
 */
export async function setPaymentUsage(
  userId: string,
  paymentId: string,
  used: boolean,
): Promise<PlainPayment | null> {
  await connectDb();
  const doc = await ExpensePayment.findOneAndUpdate(
    { _id: paymentId, userId },
    { usedThisCycle: used },
    { returnDocument: "after" },
  )
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
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

/**
 * Atomically delete the most recent payment for a fixed expense and
 * resync `lastPaidDate` on the parent. Replaces a delete-then-read
 * pattern that had a race window where a concurrent createPayment
 * could leak its `paidDate` into `lastPaidDate`.
 */
export async function unmarkLatestPayment(
  userId: string,
  fixedExpenseId: string,
): Promise<{ deleted: boolean; nextPaidDate: Date | null }> {
  await connectDb();
  const session = await ExpensePayment.startSession();
  try {
    let deleted = false;
    let nextPaidDate: Date | null = null;
    await session.withTransaction(async () => {
      const top = await ExpensePayment.find({ userId, fixedExpenseId })
        .sort({ paidDate: -1, createdAt: -1 })
        .limit(2)
        .session(session)
        .lean<Lean[]>()
        .exec();
      if (top.length === 0) return;
      const latest = top[0]!;
      const second = top[1] ?? null;
      const delRes = await ExpensePayment.deleteOne(
        { _id: latest._id.toString(), userId },
        { session },
      ).exec();
      if (delRes.deletedCount !== 1) return;
      deleted = true;
      nextPaidDate = second?.paidDate ?? null;
      await FixedExpense.updateOne(
        { _id: fixedExpenseId, userId },
        { lastPaidDate: nextPaidDate },
        { session },
      ).exec();
    });
    return { deleted, nextPaidDate };
  } finally {
    await session.endSession();
  }
}

/**
 * Atomically delete a specific payment and resync `lastPaidDate` on the
 * parent fixed expense. Same race fix as unmarkLatestPayment but used
 * by the payment-history list where the user picks which one to remove.
 */
export async function removePaymentAndResync(
  userId: string,
  paymentId: string,
  fixedExpenseId: string,
): Promise<{ deleted: boolean; nextPaidDate: Date | null }> {
  await connectDb();
  const session = await ExpensePayment.startSession();
  try {
    let deleted = false;
    let nextPaidDate: Date | null = null;
    await session.withTransaction(async () => {
      const delRes = await ExpensePayment.deleteOne(
        { _id: paymentId, userId },
        { session },
      ).exec();
      if (delRes.deletedCount !== 1) return;
      deleted = true;
      const next = await ExpensePayment.findOne({ userId, fixedExpenseId })
        .sort({ paidDate: -1, createdAt: -1 })
        .session(session)
        .lean<Lean | null>()
        .exec();
      nextPaidDate = next?.paidDate ?? null;
      await FixedExpense.updateOne(
        { _id: fixedExpenseId, userId },
        { lastPaidDate: nextPaidDate },
        { session },
      ).exec();
    });
    return { deleted, nextPaidDate };
  } finally {
    await session.endSession();
  }
}

/**
 * Bulk-record payments for several fixed expenses with the same paid
 * date — used by the auto-debit confirmation flow. Single transaction
 * does insertMany + a single updateMany so partial failures don't
 * leave half-confirmed bills behind.
 */
export async function bulkRecordPayments(
  userId: string,
  items: { fixedExpenseId: string; amountPaise: number; note: string | null }[],
  paidDate: Date,
): Promise<{ inserted: number }> {
  if (items.length === 0) return { inserted: 0 };
  await connectDb();
  const session = await ExpensePayment.startSession();
  try {
    let inserted = 0;
    await session.withTransaction(async () => {
      const docs = items.map((it) => ({
        userId,
        fixedExpenseId: it.fixedExpenseId,
        paidDate,
        amountPaise: it.amountPaise,
        note: it.note,
        usedThisCycle: null,
      }));
      const created = await ExpensePayment.insertMany(docs, { session });
      inserted = created.length;
      await FixedExpense.updateMany(
        {
          userId,
          _id: { $in: items.map((it) => it.fixedExpenseId) },
        },
        { lastPaidDate: paidDate },
        { session },
      ).exec();
    });
    return { inserted };
  } finally {
    await session.endSession();
  }
}
