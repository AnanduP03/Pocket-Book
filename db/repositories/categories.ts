import "server-only";
import { Category, type CategoryDoc, type CategoryType } from "@/db/models/Category";
import { FixedExpense } from "@/db/models/FixedExpense";
import { VariableExpense } from "@/db/models/VariableExpense";
import { connectDb } from "@/db/client";

export type PlainCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

type Lean = Omit<CategoryDoc, "_id"> & { _id: { toString(): string } };

function toPlain(c: Lean): PlainCategory {
  return {
    id: c._id.toString(),
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type ListCategoriesOptions = { type?: CategoryType };

export async function listCategories(
  userId: string,
  opts: ListCategoriesOptions = {},
): Promise<PlainCategory[]> {
  await connectDb();
  const filter: Record<string, unknown> = { userId };
  if (opts.type) filter.type = opts.type;
  const docs = await Category.find(filter)
    .sort({ type: 1, name: 1 })
    .lean<Lean[]>()
    .exec();
  return docs.map(toPlain);
}

export async function getCategoryById(
  userId: string,
  id: string,
): Promise<PlainCategory | null> {
  await connectDb();
  const doc = await Category.findOne({ _id: id, userId }).lean<Lean | null>().exec();
  return doc ? toPlain(doc) : null;
}

export type NewCategoryInput = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export async function createCategory(
  userId: string,
  input: NewCategoryInput,
): Promise<PlainCategory> {
  await connectDb();
  const created = await Category.create({ ...input, userId });
  return toPlain(created.toObject() as unknown as Lean);
}

export type CategoryPatch = {
  name?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  type?: CategoryType | undefined;
};

export async function updateCategory(
  userId: string,
  id: string,
  patch: CategoryPatch,
): Promise<PlainCategory | null> {
  await connectDb();
  const doc = await Category.findOneAndUpdate({ _id: id, userId }, patch, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<Lean | null>()
    .exec();
  return doc ? toPlain(doc) : null;
}

export type CategoryUsage = {
  fixedExpenseCount: number;
  variableExpenseCount: number;
};

export async function categoryUsage(
  userId: string,
  id: string,
): Promise<CategoryUsage> {
  await connectDb();
  const [fixedExpenseCount, variableExpenseCount] = await Promise.all([
    FixedExpense.countDocuments({ categoryId: id, userId }).exec(),
    VariableExpense.countDocuments({ categoryId: id, userId }).exec(),
  ]);
  return { fixedExpenseCount, variableExpenseCount };
}

export async function deleteCategory(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDb();
  const res = await Category.deleteOne({ _id: id, userId }).exec();
  return res.deletedCount === 1;
}
