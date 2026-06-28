import { connectDb, disconnectDb } from "@/db/client";
import { Category, type CategoryType } from "@/db/models/Category";
import { Settings } from "@/db/models/Settings";
import { IncomeEntry } from "@/db/models/IncomeEntry";
import { FixedExpense, type IntervalUnit } from "@/db/models/FixedExpense";
import { ExpensePayment } from "@/db/models/ExpensePayment";
import { VariableExpense } from "@/db/models/VariableExpense";
import { SavingsEntry, type SavingsEntryKind } from "@/db/models/SavingsEntry";
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

/** First day of the month, N months back (0 = current month). */
function monthStartUtc(monthsBack: number): Date {
  const ref = todayUtc();
  const m = ref.getUTCMonth() - monthsBack;
  const year = ref.getUTCFullYear() + Math.floor(m / 12);
  const adjMonth = ((m % 12) + 12) % 12;
  return new Date(Date.UTC(year, adjMonth, 1));
}

function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0] as T);
  }
  return out;
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

/**
 * Seed three named savings goals + a handful of quick-log presets so the
 * dashboard SavingsCard, sweep allocation, and Variable quick-add UI all
 * have something to render. sharePct sums to 100 (validated by the app).
 */
async function ensureSettings(
  userId: string,
  catByName: Map<string, Types.ObjectId>,
): Promise<void> {
  const existing = await Settings.findOne({ userId });
  const food = catByName.get("Food");
  const travel = catByName.get("Travel");
  const health = catByName.get("Health");
  const presets =
    food && travel && health
      ? [
          {
            id: "preset-coffee",
            label: "Coffee",
            amountPaise: rs(180),
            categoryId: food,
          },
          {
            id: "preset-lunch",
            label: "Lunch",
            amountPaise: rs(220),
            categoryId: food,
          },
          {
            id: "preset-cab",
            label: "Cab home",
            amountPaise: rs(260),
            categoryId: travel,
          },
        ]
      : [];

  const goals = [
    {
      id: "goal-emergency",
      name: "Emergency fund",
      amountPaise: rs(3_00_000),
      targetDate: utcDate(todayUtc().getUTCFullYear() + 1, 12, 31),
      sharePct: 50,
    },
    {
      id: "goal-vacation",
      name: "Japan trip",
      amountPaise: rs(2_00_000),
      targetDate: utcDate(todayUtc().getUTCFullYear() + 1, 4, 1),
      sharePct: 30,
    },
    {
      id: "goal-house",
      name: "Down payment",
      amountPaise: rs(15_00_000),
      targetDate: utcDate(todayUtc().getUTCFullYear() + 4, 1, 1),
      sharePct: 20,
    },
  ];

  if (!existing) {
    await Settings.create({
      userId,
      savingsGoals: goals,
      quickPresets: presets,
    });
  } else {
    existing.savingsGoals = goals;
    existing.quickPresets = presets;
    await existing.save();
  }
}

async function wipeUserData(userId: string): Promise<void> {
  await IncomeEntry.deleteMany({ userId }).exec();
  await FixedExpense.deleteMany({ userId }).exec();
  await ExpensePayment.deleteMany({ userId }).exec();
  await VariableExpense.deleteMany({ userId }).exec();
  await SavingsEntry.deleteMany({ userId }).exec();
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
      lastPaidDate: daysAgoUtc(2),
      paymentHistory: [
        { daysAgo: 2, amountPaise: rs(15_000) },
        { daysAgo: 33, amountPaise: rs(15_000) },
        { daysAgo: 64, amountPaise: rs(15_000) },
        { daysAgo: 94, amountPaise: rs(14_000) },
        { daysAgo: 125, amountPaise: rs(14_000) },
        { daysAgo: 155, amountPaise: rs(14_000) },
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
      // OVERDUE — last paid 45 days ago on a monthly cycle.
      // Action inbox should flag this.
      lastPaidDate: daysAgoUtc(45),
      paymentHistory: [
        { daysAgo: 45, amountPaise: rs(999) },
        { daysAgo: 75, amountPaise: rs(999) },
        { daysAgo: 105, amountPaise: rs(999) },
        { daysAgo: 135, amountPaise: rs(799) },
      ],
      note: "Overdue — pay before they cut the line",
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
      lastPaidDate: daysAgoUtc(75),
      paymentHistory: [
        { daysAgo: 75, amountPaise: rs(8_000) },
        { daysAgo: 165, amountPaise: rs(7_500) },
        { daysAgo: 255, amountPaise: rs(7_500) },
      ],
      note: "Quarterly premium",
    },
    {
      name: "Coffee subscription",
      category: "Subscriptions",
      amountPaise: rs(49),
      intervalValue: 1,
      intervalUnit: "week",
      startDate: daysAgoUtc(60),
      endDate: null,
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(2),
      paymentHistory: [
        { daysAgo: 2, amountPaise: rs(49) },
        { daysAgo: 9, amountPaise: rs(49) },
        { daysAgo: 16, amountPaise: rs(49) },
        { daysAgo: 23, amountPaise: rs(49) },
        { daysAgo: 30, amountPaise: rs(49) },
        { daysAgo: 37, amountPaise: rs(49) },
      ],
      note: "Auto-debit each Monday",
    },
    {
      name: "Gym membership",
      category: "Subscriptions",
      amountPaise: rs(1_499),
      intervalValue: 1,
      intervalUnit: "month",
      startDate: utcDate(2025, 1, 5),
      endDate: null,
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(8),
      paymentHistory: [
        { daysAgo: 8, amountPaise: rs(1_499) },
        { daysAgo: 38, amountPaise: rs(1_499) },
        { daysAgo: 68, amountPaise: rs(1_499) },
        { daysAgo: 98, amountPaise: rs(1_499) },
      ],
      note: "Auto-debit on the 8th",
    },
    {
      name: "Cleaner",
      category: "Subscriptions",
      amountPaise: rs(800),
      intervalValue: 2,
      intervalUnit: "week",
      startDate: utcDate(2025, 4, 1),
      endDate: null,
      isActive: true,
      isAutoDebit: false,
      lastPaidDate: daysAgoUtc(6),
      paymentHistory: [
        { daysAgo: 6, amountPaise: rs(800) },
        { daysAgo: 20, amountPaise: rs(800) },
        { daysAgo: 34, amountPaise: rs(800) },
      ],
      note: "Every other Saturday",
    },
    {
      name: "Domain renewal",
      category: "Subscriptions",
      amountPaise: rs(1_200),
      intervalValue: 1,
      intervalUnit: "year",
      startDate: utcDate(2024, 9, 12),
      endDate: null,
      isActive: true,
      isAutoDebit: true,
      lastPaidDate: daysAgoUtc(245),
      paymentHistory: [
        { daysAgo: 245, amountPaise: rs(1_200) },
        { daysAgo: 610, amountPaise: rs(1_100) },
      ],
      note: "Personal blog — renews each Sept",
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
  /** Optional tag pool — entries pull 0-2 from here. */
  tags?: readonly string[];
};

const VARIABLE_SAMPLES: VarSample[] = [
  {
    category: "Food",
    base: rs(450),
    jitterPaise: rs(300),
    notes: [
      "Lunch",
      "Dinner with friends",
      "Quick takeaway",
      "Groceries",
      "Late-night snack",
      "Coffee run",
      "Birthday dinner",
      null,
    ],
    tags: ["lunch", "groceries", "with-friends", "late-night", "treat"],
  },
  {
    category: "Travel",
    base: rs(280),
    jitterPaise: rs(200),
    notes: [
      "Cab home",
      "Petrol",
      "Metro pass",
      "Auto fare",
      "Airport pickup",
      "Weekend trip fuel",
      null,
    ],
    tags: ["commute", "weekend", "work-travel"],
  },
  {
    category: "Utilities",
    base: rs(1_200),
    jitterPaise: rs(500),
    notes: [
      "Electricity bill",
      "Water bill",
      "Cooking gas refill",
      "Wi-Fi top-up",
      null,
    ],
    tags: ["bill"],
  },
  {
    category: "Health",
    base: rs(800),
    jitterPaise: rs(400),
    notes: [
      "Pharmacy",
      "Doctor visit",
      "Lab test",
      "Physio session",
      "Vitamins",
      null,
    ],
    tags: ["tax-deductible", "wellness"],
  },
  {
    category: "Other",
    base: rs(350),
    jitterPaise: rs(250),
    notes: [
      "Stationery",
      "Gift",
      "Repair",
      "Books",
      "Laundry",
      "Donation",
      null,
    ],
    tags: ["gift", "tax-deductible", "needed"],
  },
];

/**
 * Pick a small set of tags for an expense. Most entries are tagless;
 * a chunk get 1 tag; a smaller slice get 2. Mirrors how a real user tags
 * — sparingly, then in clusters once they discover the feature.
 */
function pickTags(pool: readonly string[] | undefined): string[] {
  if (!pool || pool.length === 0) return [];
  const r = Math.random();
  if (r < 0.55) return [];
  if (r < 0.85) return pickN(pool, 1);
  return pickN(pool, 2);
}

async function seedVariable(
  userId: string,
  catByName: Map<string, Types.ObjectId>,
): Promise<void> {
  type VarDoc = {
    userId: string;
    date: Date;
    amountPaise: number;
    currency: string;
    categoryId: Types.ObjectId;
    note: string | null;
    tags: string[];
  };
  const docs: VarDoc[] = [];

  // 6 months of realistic variable spend, with weekend bias for Food/Travel.
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const monthStart = monthStartUtc(monthOffset);
    const daysInMonth = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    ).getUTCDate();

    // Vary the count per month so the trajectory cone has shape.
    const baseCount = 22 + Math.floor(Math.random() * 12);
    const isLight = monthOffset === 4; // 4 months ago = a quiet month
    const count = isLight ? Math.floor(baseCount * 0.6) : baseCount;

    for (let i = 0; i < count; i++) {
      const sample = pick(VARIABLE_SAMPLES);
      const categoryId = catByName.get(sample.category);
      if (!categoryId) continue;

      // Bias Food + Travel toward weekends to make the heatmap show pattern.
      let day = 1 + Math.floor(Math.random() * (daysInMonth - 1));
      if (sample.category === "Food" || sample.category === "Travel") {
        if (Math.random() < 0.55) {
          // Re-roll until we land on a Sat/Sun in this month.
          for (let attempt = 0; attempt < 8; attempt++) {
            const probe = new Date(
              Date.UTC(
                monthStart.getUTCFullYear(),
                monthStart.getUTCMonth(),
                day,
              ),
            );
            const dow = probe.getUTCDay();
            if (dow === 0 || dow === 6) break;
            day = 1 + Math.floor(Math.random() * (daysInMonth - 1));
          }
        }
      }

      // Don't generate future-dated entries for the current month.
      if (monthOffset === 0 && day > todayUtc().getUTCDate()) {
        day = todayUtc().getUTCDate();
      }

      const date = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day),
      );
      docs.push({
        userId,
        date,
        amountPaise: jitter(sample.base, sample.jitterPaise),
        currency: "INR",
        categoryId,
        note: pick(sample.notes),
        tags: pickTags(sample.tags),
      });
    }
  }

  // ---- Rituals: same category + similar amount on a weekly cadence ----
  // The detector wants ≥3 hits within 60 days, ±20% amount tolerance.
  // Seed two strong rituals so the chip row populates immediately.
  const food = catByName.get("Food");
  const travel = catByName.get("Travel");
  if (food) {
    // Saturday brunch ritual — last 6 Saturdays.
    for (let w = 0; w < 6; w++) {
      const ref = todayUtc();
      const dow = ref.getUTCDay();
      const daysToSat = (dow + 1) % 7; // 0 if today is Sat
      const daysBack = daysToSat + w * 7;
      docs.push({
        userId,
        date: daysAgoUtc(daysBack),
        amountPaise: jitter(rs(620), rs(60)),
        currency: "INR",
        categoryId: food,
        note: "Saturday brunch",
        tags: ["with-friends"],
      });
    }
  }
  if (travel) {
    // Weekday cab home — last 5 Wednesdays.
    for (let w = 0; w < 5; w++) {
      const ref = todayUtc();
      const dow = ref.getUTCDay(); // 0=Sun..6=Sat
      const daysToWed = (dow + 4) % 7; // back to nearest past Wed
      const daysBack = daysToWed + w * 7 + (daysToWed === 0 ? 7 : 0);
      docs.push({
        userId,
        date: daysAgoUtc(daysBack),
        amountPaise: jitter(rs(245), rs(35)),
        currency: "INR",
        categoryId: travel,
        note: "Cab home",
        tags: ["commute"],
      });
    }
  }

  // ---- Today: a couple of fresh logs so the Today timeline isn't empty.
  if (food) {
    docs.push({
      userId,
      date: todayUtc(),
      amountPaise: rs(180),
      currency: "INR",
      categoryId: food,
      note: "Morning coffee",
      tags: [],
    });
    docs.push({
      userId,
      date: todayUtc(),
      amountPaise: rs(240),
      currency: "INR",
      categoryId: food,
      note: "Lunch",
      tags: ["lunch"],
    });
  }
  if (travel) {
    docs.push({
      userId,
      date: todayUtc(),
      amountPaise: rs(210),
      currency: "INR",
      categoryId: travel,
      note: "Auto to office",
      tags: ["commute"],
    });
  }

  // ---- Tax-deductible cluster — guarantees the Tax export has rows.
  const health = catByName.get("Health");
  const other = catByName.get("Other");
  const taxYear = todayUtc().getUTCFullYear() - 1;
  if (health) {
    docs.push({
      userId,
      date: utcDate(taxYear, 7, 12),
      amountPaise: rs(1_800),
      currency: "INR",
      categoryId: health,
      note: "Annual physical",
      tags: ["tax-deductible"],
    });
    docs.push({
      userId,
      date: utcDate(taxYear, 11, 3),
      amountPaise: rs(2_400),
      currency: "INR",
      categoryId: health,
      note: "Dental work",
      tags: ["tax", "wellness"],
    });
  }
  if (other) {
    docs.push({
      userId,
      date: utcDate(taxYear, 4, 22),
      amountPaise: rs(5_000),
      currency: "INR",
      categoryId: other,
      note: "Charity donation",
      tags: ["tax-deductible", "gift"],
    });
  }

  if (docs.length > 0) await VariableExpense.insertMany(docs);
  console.log(
    `Variable expenses: ${docs.length} inserted (incl. rituals, today, tax-tagged)`,
  );
}

/**
 * Plant a savings ledger so the dashboard's SavingsCard, on-pace label,
 * and goal progress strips have data. Mix of explicit deposits, monthly
 * surplus sweeps, and a one-off withdrawal — each allocated to a goal
 * (or null for legacy general balance).
 */
async function seedSavings(userId: string): Promise<void> {
  type Entry = {
    daysAgo: number;
    amountPaise: number;
    kind: SavingsEntryKind;
    note: string | null;
    goalId: string | null;
  };
  const entries: Entry[] = [
    // Older deposits — pre-goals era, general balance.
    { daysAgo: 320, amountPaise: rs(15_000), kind: "manual_deposit", note: "Diwali bonus", goalId: null },
    { daysAgo: 270, amountPaise: rs(5_000), kind: "manual_deposit", note: null, goalId: null },

    // Past 6 months of monthly sweeps, allocated by sharePct.
    // Each sweep splits 50/30/20 across the three goals.
    ...buildSweepHistory(),

    // A withdrawal — testing negative entries render correctly.
    { daysAgo: 95, amountPaise: -rs(8_000), kind: "manual_withdrawal", note: "Phone replacement", goalId: null },

    // Recent goal-specific deposits.
    { daysAgo: 60, amountPaise: rs(10_000), kind: "manual_deposit", note: "Tax refund", goalId: "goal-emergency" },
    { daysAgo: 30, amountPaise: rs(7_500), kind: "manual_deposit", note: "Side gig", goalId: "goal-vacation" },
    { daysAgo: 12, amountPaise: rs(3_000), kind: "manual_deposit", note: null, goalId: "goal-emergency" },
  ];

  await SavingsEntry.insertMany(
    entries.map((e) => ({
      userId,
      amountPaise: e.amountPaise,
      kind: e.kind,
      effectiveDate: daysAgoUtc(e.daysAgo),
      note: e.note,
      goalId: e.goalId,
    })),
  );
  console.log(`Savings entries: ${entries.length} inserted`);
}

function buildSweepHistory(): {
  daysAgo: number;
  amountPaise: number;
  kind: SavingsEntryKind;
  note: string | null;
  goalId: string | null;
}[] {
  const out: {
    daysAgo: number;
    amountPaise: number;
    kind: SavingsEntryKind;
    note: string | null;
    goalId: string | null;
  }[] = [];
  // Months 1..5 ago each get a sweep on the 1st of the *following* month.
  const sweepAmounts = [rs(8_500), rs(6_200), rs(11_000), rs(4_800), rs(9_300)];
  for (let i = 0; i < sweepAmounts.length; i++) {
    const amt = sweepAmounts[i] ?? 0;
    const daysAgo = 30 * (i + 1);
    const splits: { goalId: string; share: number }[] = [
      { goalId: "goal-emergency", share: 0.5 },
      { goalId: "goal-vacation", share: 0.3 },
      { goalId: "goal-house", share: 0.2 },
    ];
    for (const s of splits) {
      out.push({
        daysAgo,
        amountPaise: Math.round(amt * s.share),
        kind: "month_surplus",
        note: null,
        goalId: s.goalId,
      });
    }
  }
  return out;
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
  await ensureSettings(userId, catByName);

  console.log("Wiping income, fixed, payments, variable, savings…");
  await wipeUserData(userId);

  console.log("Planting demo data…");
  await seedIncome(userId);
  await seedFixed(userId, catByName);
  await seedVariable(userId, catByName);
  await seedSavings(userId);

  await disconnectDb();
  console.log("Done. Test data ready.");
}

run().catch(async (err) => {
  console.error("Test seed failed:", err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
