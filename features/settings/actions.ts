"use server";

import { revalidatePath } from "next/cache";
import { settingsInputSchema } from "./schema";
import { updateSettings, type PlainSettings } from "@/db/repositories/settings";
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

export async function updateSettingsAction(
  raw: unknown,
): Promise<ActionResult<PlainSettings>> {
  const user = await requireUser();
  const parsed = settingsInputSchema.safeParse(raw);
  if (!parsed.success) return fromValidation(parsed.error);
  try {
    const updated = await updateSettings(user.id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath("/variable");
    revalidatePath("/fixed");
    revalidatePath("/income");
    revalidatePath("/settings");
    return { ok: true, data: updated };
  } catch (err) {
    return fromUnknown(err);
  }
}
