import { z } from "zod";

export const savingsGoalInputSchema = z.object({
  amountPaise: z.number().int().positive("Goal amount must be positive"),
  targetDate: z.date(),
});

export const namedSavingsGoalInputSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1, "Goal name is required").max(40),
  amountPaise: z.number().int().positive("Goal amount must be positive"),
  targetDate: z.date(),
  sharePct: z.number().min(0).max(100),
});

export const savingsGoalsInputSchema = z
  .array(namedSavingsGoalInputSchema)
  .max(12, "Up to 12 goals supported")
  .superRefine((goals, ctx) => {
    if (goals.length === 0) return; // empty list is fine — user cleared all
    const ids = new Set<string>();
    for (const g of goals) {
      if (ids.has(g.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate goal id",
          path: ["id"],
        });
        return;
      }
      ids.add(g.id);
    }
    const total = goals.reduce((s, g) => s + g.sharePct, 0);
    // Allow tiny float drift; require ~100.
    if (Math.abs(total - 100) > 0.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Shares must sum to 100% (got ${total.toFixed(0)}%)`,
        path: ["sharePct"],
      });
    }
  });

export const quickPresetInputSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1, "Label is required").max(24),
  amountPaise: z.number().int().positive("Amount must be positive"),
  categoryId: z.string().min(1, "Pick a category"),
});

export const settingsInputSchema = z.object({
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO code, e.g. INR"),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  locale: z
    .string()
    .trim()
    .min(2, "Locale is too short")
    .max(20, "Locale is too long"),
  /** Legacy single-goal field — sent by SettingsForm. Translated to a
   *  one-entry savingsGoals array on the server. */
  savingsGoal: savingsGoalInputSchema.nullable().optional(),
  /** New named-goal array — sent by /savings/goals (Phase B.2). */
  savingsGoals: savingsGoalsInputSchema.optional(),
  quickPresets: z.array(quickPresetInputSchema).max(6).optional(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalInputSchema>;
export type NamedSavingsGoalInput = z.infer<typeof namedSavingsGoalInputSchema>;
export type QuickPresetInput = z.infer<typeof quickPresetInputSchema>;
