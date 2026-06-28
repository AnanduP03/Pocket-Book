"use server";

import { revalidatePath } from "next/cache";
import { savingsGoalsInputSchema, settingsInputSchema } from "./schema";
import {
  updateSettings,
  type PlainNamedSavingsGoal,
  type PlainSettings,
} from "@/db/repositories/settings";
import { requireUser } from "@/lib/auth/server";

type Ok<T> = { ok: true; data: T };
type Fail = {
  ok: false;
  error: { code: string; message: string; field?: string | undefined };
};
export type ActionResult<T> = Ok<T> | Fail;

function fromUnknown(err: unknown): Fail {
  const message = err instanceof Error ? err.message : "Unexpected error";
  return { ok: false, error: { code: "UNKNOWN", message } };
}

function fromValidation(error: { issues: { path: PropertyKey[]; message: string }[] }): Fail {
  const first = error.issues[0];
  return {
    ok: false,
    error: {
      code: "VALIDATION",
      field: typeof first?.path[0] === "string" ? first.path[0] : undefined,
      message: first?.message ?? "Invalid input",
    },
  };
}

function newGoalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function updateSettingsAction(
  raw: unknown,
): Promise<ActionResult<PlainSettings>> {
  const user = await requireUser();
  const parsed = settingsInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const { savingsGoal, savingsGoals, quickPresets, ...rest } = parsed.data;

    // Resolve which goal-shape the form sent. The new /savings/goals page
    // sends `savingsGoals` directly. Legacy SettingsForm sends the single
    // `savingsGoal` shape (or null to clear) — translate it to a one-entry
    // named goal so the new schema is the only on-disk truth.
    let resolvedGoals: PlainNamedSavingsGoal[] | undefined;
    if (savingsGoals !== undefined) {
      resolvedGoals = savingsGoals;
    } else if (savingsGoal !== undefined) {
      resolvedGoals = savingsGoal
        ? [
            {
              id: newGoalId(),
              name: "General",
              amountPaise: savingsGoal.amountPaise,
              targetDate: savingsGoal.targetDate,
              sharePct: 100,
            },
          ]
        : [];
    }

    const updated = await updateSettings(user.id, {
      ...rest,
      quickPresets: quickPresets ?? [],
      ...(resolvedGoals !== undefined ? { savingsGoals: resolvedGoals } : {}),
    });
    revalidatePath("/dashboard");
    revalidatePath("/variable");
    revalidatePath("/fixed");
    revalidatePath("/income");
    revalidatePath("/settings");
    revalidatePath("/savings");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}

/**
 * Focused action for the /savings/goals page — updates only the goals
 * array without round-tripping the other settings fields.
 */
export async function updateSavingsGoalsAction(
  raw: unknown,
): Promise<ActionResult<PlainSettings>> {
  const user = await requireUser();
  const parsed = savingsGoalsInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateSettings(user.id, {
      savingsGoals: parsed.data,
    });
    revalidatePath("/dashboard");
    revalidatePath("/savings");
    revalidatePath("/savings/goals");
    revalidatePath("/settings");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}
