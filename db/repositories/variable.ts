import "server-only";
import { VariableExpense, type VariableExpenseDoc } from "@/db/models/VariableExpense";
import { connectDb } from "@/db/client";

export type PlainVariable = {
  id: string;
  date: Date;
  amountPaise: number;
  currency: string;
  categoryId: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<VariableExpenseDoc, "_id" | "categoryId"> & {
  _id: { toString(): string };
  categoryId: { toString(): string };
};

function toPlain(d: Lean): PlainVariable {
  return {
    id: d._id.toString(),
    date: d.date,
    amountPaise: d.amountPaise,
    currency: d.currency,
    categoryId: d.categoryId.toString(),
    note: d.note,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export type ListVariableOptions = {
  start?: Date;
  end?: Date;
  categoryIds?: string[];
  text?: string;
  limit?: number;
  skip?: number;
};

function buildFilter(
  userId: string,
  opts: ListVariableOptions,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId };
  if (opts.start || opts.end) {
    const range: Record<string, Date> = {};
    if (opts.start) range.$gte = opts.start;
    if (opts.end) range.$lte = opts.end;
    filter.date = range;
  }
  if (opts.categoryIds?.length) filter.categoryId = { $in: opts.categoryIds };
  if (opts.text) filter.note = { $regex: opts.text, $options: "i" };
  return filter;
}

export async function listVariable(
  userId: string,
  opts: ListVariableOptions = {},
): Promise<PlainVariable[]> {
  await connectDb();
  const docs = await VariableExpense.find(buildFilter(userId, opts))
    .sort({ date: -1, _id: -1 })
    .skip(opts.skip ?? 0)
    .limit(opts.limit ?? 200)
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export async function listVariableWithCount(
  userId: string,
  opts: ListVariableOptions = {},
): Promise<{ items: PlainVariable[]; total: number }> {
  await connectDb();
  const filter = buildFilter(userId, opts);
  const [docs, total] = await Promise.all([
    VariableExpense.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 20)
      .lean<Lean[]>()
      .exec(),
    VariableExpense.countDocuments(filter).exec(),
  ]);
  return { items: docs.map(toPlain), total };
}

export async function getVariableById(
  userId: string,
  id: string,
): Promise<PlainVariable | null> {
  await connectDb();
  const doc = await VariableExpense.findOne({ _id: id, userId }).lean<Lean | null>().exec();
  return doc ? toPlain(doc) : null;
}

export type NewVariableInput = Omit<PlainVariable, "id" | "createdAt" | "updatedAt">;

export async function createVariable(
  userId: string,
  input: NewVariableInput,
): Promise<PlainVariable> {
  await connectDb();
  const created = await VariableExpense.create({ ...input, userId });
  return toPlain(created.toObject() as unknown as Lean);
}

export type VariablePatch = Partial<NewVariableInput>;

export async function updateVariable(
  userId: string,
  id: string,
  patch: VariablePatch,
): Promise<PlainVariable | null> {
  await connectDb();
  const doc = await VariableExpense.findOneAndUpdate({ _id: id, userId }, patch, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}

export async function deleteVariable(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const res = await VariableExpense.deleteOne({ _id: id, userId }).exec();
  return res.deletedCount === 1;
}
