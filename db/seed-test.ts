import { connectDb, disconnectDb } from "@/db/client";
import { Category, type CategoryType } from "@/db/models/Category";
import { Settings } from "@/db/models/Settings";
import { IncomeEntry } from "@/db/models/IncomeEntry";
import { FixedExpense, type IntervalUnit } from "@/db/models/FixedExpense";
import { ExpensePayment } from "@/db/models/ExpensePayment";
import { VariableExpense } from "@/db/models/VariableExpense";
import { User } from "@/db/models/User";
import type { Types } from "mongoose";

type Seed = { name: string; type: CategoryType; icon: string; color: string };

const DEFAULT_CATEGORIES: Seed[] = [
  { name: "Rent", type: "Fixed", icon: "Home", color: "#D8C7E8" },
  { name: "EMI", type: "Fixed", icon: "CreditCard", color: "#FFD3B8" },
  { name: "Insurance", type: "Fixed", icon: "ShieldCheck", color: "#C5DCEE" },
  { name: "Subscriptions", type: "Fixed", icon: "Sparkles", color: "#F9C8D9" },
  { name: "Investments", type: "Fixed", icon: "PiggyBank", color: "#C8E6D0" },
  { name: "Recharge", type: "Fixed", icon: "Smartphone", color: "#E8D5C4" },
  { name: "Utilities", type: "Variable", icon: "Zap", color: "#FCE8B2" },
  { name: "Food", type: "Variable", icon: "Utensils", color: "#FFD3B8" },
  { name: "Travel", type: "Variable", icon: "Car", color: "#C5DCEE" },
  { name: "Health", type: "Variable", icon: "HeartPulse", color: "#F9C8D9" },
  { name: "Other", type: "Variable", icon: "Sparkle", color: "#D4E4D8" },
];

const rs = (rupees: number): number => Math.round(rupees * 100);

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(days: number): Date {
  const t = todayUtc().getTime();
  return new Date(t - days * 86_400_000);
}

function daysFromNowUtc(days: number): Date {
  return daysAgoUtc(-days);
}

function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function jitter(base: number, plusMinusPaise: number): number {
  const swing = Math.floor(Math.random() * (2 * plusMinusPaise + 1)) - plusMinusPaise;
  return Math.max(100, base + swing);
}

async function ensureCategories(
  userId: string,
): Promise<Map<string, Types.ObjectId>> {
  for (const c of DEFAULT_CATEGORIES) {
    await Category.updateOne(
      { userId, name: c.name, type: c.type },
      { $setOnInsert: { ...c, userId } },
      { upsert: true, collation: { locale: "en", strength: 2 } },
    );
  }
  const docs = await Category.find({ userId }).lean<
    { _id: Types.ObjectId; name: string }[]
  >();
  const m = new Map<string, Types.ObjectId>();
  for (const d of docs) m.set(d.name, d._id);
  return m;
}

async function ensureSettings(userId: string): Promise<void> {
  const existing = await Settings.findOne({ userId }).lean();
  if (!existing) await Settings.create({ userId });
}

async function wipeUserData(userId: string): Promise<void> {
  await IncomeEntry.deleteMany({ userId }).exec();
  await FixedExpense.deleteMany({ userId }).exec();
  await ExpensePayment.deleteMany({ userId }).exec();
  await VariableExpense.deleteMany({ userId }).exec();
}

async function seedIncome(userId: string): Promise<void> {
  await IncomeEntry.create([
    {
      userId,
      amountPaise: rs(40_000),
      effectiveDate: utcDate(2024, 1, 1),
      note: "Starting salary",
    },
    {
      userId,
      amountPaise: rs(50_000),
      effectiveDate: utcDate(2025, 4, 1),
      note: "Annual increment",
    },
    {
      userId,
      amountPaise: rs(65_000),
      effectiveDate: utcDate(2026, 4, 1),
      note: "Promotion",
    },
  ]);
  console.log("Income entries: 3 inserted");
}

type FixedSeed = {
  name: string;
  category: string;
  amountPaise: number;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  isAutoDebit: boolean;
  lastPaidDate: Date | null;
  paymentHistory: { daysAgo: number; amountPaise: number }[];
  note: string | null;
};

async function seedFixed(
  userId: string,
  catByName: Map<string, Types.ObjectId>,
): Promise<void> {
  const fixes: FixedSeed[] = [
    {
      name: "Apartment rent",
      category: "Rent",
      amountPaise: rs(15_000),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2024, 1, 1),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: todayUtc(),
      paymentHistory: [
        { daysAgo: 0, amountPaise: rs(15_000) },
        { daysAgo: 31, amountPaise: rs(15_000) },
        { daysAgo: 62, amountPaise: rs(15_000) },
        { daysAgo: 92, amountPaise: rs(14_000) },
        { daysAgo: 123, amountPaise: rs(14_000) },
        { daysAgo: 153, amountPaise: rs(14_000) },
      ],
      note: "Lease renews each year on Jan 1",
    },
    {
      name: "Home internet",
      category: "Subscriptions",
      amountPaise: rs(999),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2024, 6, 15),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(70),
      paymentHistory: [
        { daysAgo: 70, amountPaise: rs(999) },
        { daysAgo: 100, amountPaise: rs(999) },
        { daysAgo: 130, amountPaise: rs(799) },
      ],
      note: null,
    },
    {
      name: "Streaming bundle",
      category: "Subscriptions",
      amountPaise: rs(2_499),
      intervalValue: 1,
      intervalUnit: "year",
      startDate: utcDate(2025, 3, 1),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(60),
      paymentHistory: [{ daysAgo: 60, amountPaise: rs(2_499) }],
      note: "Annual plan — much cheaper than monthly",
    },
    {
      name: "Health insurance",
      category: "Insurance",
      amountPaise: rs(8_000),
      intervalValue: 3,
      intervalUnit: "month",
      startDate: utcDate(2024, 1, 15),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(120),
      paymentHistory: [
        { daysAgo: 120, amountPaise: rs(8_000) },
        { daysAgo: 210, amountPaise: rs(7_500) },
        { daysAgo: 300, amountPaise: rs(7_500) },
      ],
      note: "Quarterly premium",
    },
    {
      name: "Coffee subscription",
      category: "Subscriptions",
      amountPaise: rs(49),
      intervalValue: 1,
      intervalUnit: "week",
      startDate: daysAgoUtc(30),
      endDate: null,
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(2),
      paymentHistory: [
        { daysAgo: 2, amountPaise: rs(49) },
        { daysAgo: 9, amountPaise: rs(49) },
        { daysAgo: 16, amountPaise: rs(49) },
        { daysAgo: 23, amountPaise: rs(49) },
      ],
      note: "Auto-debit each Monday",
    },
    {
      name: "Car loan EMI",
      category: "EMI",
      amountPaise: rs(12_000),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2024, 1, 1),
      endDate: utcDate(2027, 1, 1),
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(5),
      paymentHistory: [
        { daysAgo: 5, amountPaise: rs(12_000) },
        { daysAgo: 35, amountPaise: rs(12_000) },
        { daysAgo: 65, amountPaise: rs(12_000) },
        { daysAgo: 95, amountPaise: rs(12_000) },
      ],
      note: "3-year loan, ends Jan 2027",
    },
    {
      name: "Old magazine subscription",
      category: "Subscriptions",
      amountPaise: rs(500),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2024, 6, 1),
      endDate: null,
      isActive: false,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(180),
      paymentHistory: [{ daysAgo: 180, amountPaise: rs(500) }],
      note: "Cancelled — keeping for history",
    },
    {
      name: "Future internet upgrade",
      category: "Subscriptions",
      amountPaise: rs(2_999),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: daysFromNowUtc(20),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: null,
      paymentHistory: [],
      note: "New plan starts in 20 days",
    },
    {
      name: "SIP — index fund",
      category: "Investments",
      amountPaise: rs(5_000),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2025, 1, 5),
      endDate: null,
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(10),
      paymentHistory: [
        { daysAgo: 10, amountPaise: rs(5_000) },
        { daysAgo: 40, amountPaise: rs(5_000) },
        { daysAgo: 70, amountPaise: rs(5_000) },
        { daysAgo: 100, amountPaise: rs(5_000) },
      ],
      note: "Pay yourself first — auto-debits on the 5th",
    },
    {
      name: "Mobile recharge",
      category: "Recharge",
      amountPaise: rs(399),
      intervalValue: 28,
      intervalUnit: "day",
      startDate: utcDate(2025, 6, 1),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(33),
      paymentHistory: [
        { daysAgo: 33, amountPaise: rs(399) },
        { daysAgo: 61, amountPaise: rs(349) },
      ],
      note: "Prepaid plan — every 28 days",
    },
  ];

  for (const f of fixes) {
    const categoryId = catByName.get(f.category);
    if (!categoryId) {
      console.warn(`  skip ${f.name}: category ${f.category} not found`);
      continue;
    }
    const created = await FixedExpense.create({
      userId,
      name: f.name,
      categoryId,
      amountPaise: f.amountPaise,
      intervalValue: f.intervalValue,
      intervalUnit: f.intervalUnit,
      startDate: f.startDate,
      endDate: f.endDate,
      isActive: f.isActive,
      isAutoDebit: f.isAutoDebit,
      lastPaidDate: f.lastPaidDate,
      note: f.note,
    });
    for (const p of f.paymentHistory) {
      await ExpensePayment.create({
        userId,
        fixedExpenseId: created._id,
        paidDate: daysAgoUtc(p.daysAgo),
        amountPaise: p.amountPaise,
        note: null,
      });
    }
  }
  console.log(`Fixed expenses: ${fixes.length} inserted with payment history`);
}

type VarSample = {
  category: string;
  base: number;
  jitterPaise: number;
  notes: (string | null)[];
};

const VARIABLE_SAMPLES: VarSample[] = [
  {
    category: "Food",
    base: rs(450),
    jitterPaise: rs(300),
    notes: ["Lunch", "Dinner with friends", "Quick takeaway", "Groceries", null],
  },
  {
    category: "Travel",
    base: rs(280),
    jitterPaise: rs(200),
    notes: ["Cab home", "Petrol", "Metro pass", "Auto fare", null],
  },
  {
    category: "Utilities",
    base: rs(1_200),
    jitterPaise: rs(500),
    notes: ["Electricity bill", "Water bill", "Cooking gas refill", null],
  },
  {
    category: "Health",
    base: rs(800),
    jitterPaise: rs(400),
    notes: ["Pharmacy", "Doctor visit", "Lab test", null],
  },
  {
    category: "Other",
    base: rs(350),
    jitterPaise: rs(250),
    notes: ["Stationery", "Gift", "Repair", "Misc", null],
  },
];

async function seedVariable(
  userId: string,
  catByName: Map<string, Types.ObjectId>,
): Promise<void> {
  const docs: {
    userId: string;
    date: Date;
    amountPaise: number;
    currency: string;
    categoryId: Types.ObjectId;
    note: string | null;
  }[] = [];

  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const sample = pick(VARIABLE_SAMPLES);
      const categoryId = catByName.get(sample.category);
      if (!categoryId) continue;
      const dayInMonth = 1 + Math.floor(Math.random() * 27);
      const ref = new Date();
      const month = ref.getUTCMonth() - monthOffset;
      const year = ref.getUTCFullYear() + Math.floor(month / 12);
      const adjMonth = ((month % 12) + 12) % 12;
      const date = new Date(Date.UTC(year, adjMonth, dayInMonth));
      docs.push({
        userId,
        date,
        amountPaise: jitter(sample.base, sample.jitterPaise),
        currency: "INR",
        categoryId,
        note: pick(sample.notes),
      });
    }
  }

  if (docs.length > 0) await VariableExpense.insertMany(docs);
  console.log(`Variable expenses: ${docs.length} inserted across 6 months`);
}

async function run(): Promise<void> {
  const email = (process.env.SEED_USER_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.error(
      "SEED_USER_EMAIL is required. Sign up via /auth/signup first, then:\n" +
        "  SEED_USER_EMAIL=you@example.com pnpm db:seed:test",
    );
    process.exit(1);
  }

  await connectDb();
  console.log("Connected to MongoDB");

  const user = await User.findOne({ email })
    .collation({ locale: "en", strength: 2 })
    .lean<{ _id: { toString(): string } } | null>()
    .exec();
  if (!user) {
    console.error(
      `No user found for ${email}. Sign up at /auth/signup first.`,
    );
    await disconnectDb();
    process.exit(1);
  }
  const userId = user._id.toString();
  console.log(`Seeding under user ${email} (${userId})`);

  console.log("Ensuring default categories + settings…");
  await Category.syncIndexes();
  await Settings.syncIndexes();
  const catByName = await ensureCategories(userId);
  await ensureSettings(userId);

  console.log("Wiping income, fixed, payments, variable…");
  await wipeUserData(userId);

  console.log("Planting demo data…");
  await seedIncome(userId);
  await seedFixed(userId, catByName);
  await seedVariable(userId, catByName);

  await disconnectDb();
  console.log("Done. Test data ready.");
}

run().catch(async (err) => {
  console.error("Test seed failed:", err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
