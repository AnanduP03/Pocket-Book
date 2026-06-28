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
  goalId: string | null;
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
    goalId: d.goalId ?? null,
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

/**
 * Per-goal balance breakdown. Returns a map keyed by `goalId`, with a
 * special `null` key for entries that have no goalId set (legacy /
 * pre-named-goals contributions). Useful for the dashboard's stacked
 * progress strip and the goal-detail page.
 */
export async function getSavingsBalanceByGoal(
  userId: string,
): Promise<Map<string | null, number>> {
  await connectDb();
  const rows = await SavingsEntry.aggregate<{ _id: string | null; total: number }>([
    { $match: { userId: toObjectId(userId) } },
    { $group: { _id: "$goalId", total: { $sum: "$amountPaise" } } },
  ]).exec();
  const map = new Map<string | null, number>();
  for (const r of rows) map.set(r._id ?? null, r.total ?? 0);
  return map;
}

/**
 * Entries belonging to a single goal, sorted chronologically — used to
 * draw the per-goal trajectory.
 */
export async function listSavingsForGoal(
  userId: string,
  goalId: string,
): Promise<PlainSavingsEntry[]> {
  await connectDb();
  const docs = await SavingsEntry.find({ userId, goalId })
    .sort({ effectiveDate: 1, createdAt: 1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export type NewSavingsInput = {
  amountPaise: number;
  kind: SavingsEntryKind;
  effectiveDate: Date;
  note: string | null;
  goalId?: string | null;
};

export async function createSavings(
  userId: string,
  input: NewSavingsInput,
): Promise<PlainSavingsEntry> {
  await connectDb();
  const created = await SavingsEntry.create({
    ...input,
    goalId: input.goalId ?? null,
    userId,
  });
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

export type SavingsYearAggregate = {
  /** 12 entries (Jan..Dec) of net delta in paise. */
  monthly: number[];
  /** Count of `month_surplus` entries in the year. */
  sweepsCount: number;
  /** Total entries in the year — used for "hasData" gating. */
  totalCount: number;
};

/**
 * Single aggregation that powers Year-in-Review without pulling the
 * entire savings collection. Buckets entries by month index (1..12 in
 * Mongo's `$month`, normalized to 0..11 here) and counts sweeps in one
 * pipeline.
 */
export async function savingsAggregateForYear(
  userId: string,
  year: number,
): Promise<SavingsYearAggregate> {
  await connectDb();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const rows = await SavingsEntry.aggregate<{
    _id: { month: number; kind: SavingsEntryKind };
    total: number;
    count: number;
  }>([
    {
      $match: {
        userId: toObjectId(userId),
        effectiveDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { month: { $month: "$effectiveDate" }, kind: "$kind" },
        total: { $sum: "$amountPaise" },
        count: { $sum: 1 },
      },
    },
  ]).exec();

  const monthly = new Array<number>(12).fill(0);
  let sweepsCount = 0;
  let totalCount = 0;
  for (const r of rows) {
    const idx = r._id.month - 1;
    if (idx >= 0 && idx < 12) monthly[idx] = (monthly[idx] ?? 0) + (r.total ?? 0);
    if (r._id.kind === "month_surplus") sweepsCount += r.count ?? 0;
    totalCount += r.count ?? 0;
  }
  return { monthly, sweepsCount, totalCount };
}
