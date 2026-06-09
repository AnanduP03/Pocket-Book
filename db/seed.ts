import { connectDb, disconnectDb } from "@/db/client";
import { Category, type CategoryType } from "@/db/models/Category";
import { Settings } from "@/db/models/Settings";
import { User } from "@/db/models/User";

type Seed = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

const DEFAULT_CATEGORIES: Seed[] = [
  // Fixed
  { name: "Rent", type: "Fixed", icon: "Home", color: "#D8C7E8" },
  { name: "EMI", type: "Fixed", icon: "CreditCard", color: "#FFD3B8" },
  { name: "Insurance", type: "Fixed", icon: "ShieldCheck", color: "#C5DCEE" },
  { name: "Subscriptions", type: "Fixed", icon: "Sparkles", color: "#F9C8D9" },
  { name: "Investments", type: "Fixed", icon: "PiggyBank", color: "#C8E6D0" },
  { name: "Recharge", type: "Fixed", icon: "Smartphone", color: "#E8D5C4" },
  // Variable
  { name: "Utilities", type: "Variable", icon: "Zap", color: "#FCE8B2" },
  { name: "Food", type: "Variable", icon: "Utensils", color: "#FFD3B8" },
  { name: "Travel", type: "Variable", icon: "Car", color: "#C5DCEE" },
  { name: "Health", type: "Variable", icon: "HeartPulse", color: "#F9C8D9" },
  { name: "Other", type: "Variable", icon: "Sparkle", color: "#D4E4D8" },
];

async function seed(): Promise<void> {
  const email = (process.env.SEED_USER_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.error(
      "SEED_USER_EMAIL is required. Sign up via /auth/signup first, then:\n" +
        "  SEED_USER_EMAIL=you@example.com pnpm db:seed",
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

  await Category.syncIndexes();
  await Settings.syncIndexes();
  console.log("Indexes synced");

  let inserted = 0;
  let skipped = 0;
  for (const c of DEFAULT_CATEGORIES) {
    const result = await Category.updateOne(
      { userId, name: c.name, type: c.type },
      { $setOnInsert: { ...c, userId } },
      { upsert: true, collation: { locale: "en", strength: 2 } },
    );
    if (result.upsertedCount > 0) inserted++;
    else skipped++;
  }
  console.log(`Categories: ${inserted} inserted, ${skipped} already present`);

  const existingSettings = await Settings.findOne({ userId }).lean();
  if (!existingSettings) {
    await Settings.create({ userId });
    console.log("Settings: created defaults (INR / en-IN / week-start Mon)");
  } else {
    console.log("Settings: already present");
  }

  await disconnectDb();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  void disconnectDb().finally(() => process.exit(1));
});
