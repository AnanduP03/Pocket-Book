"use server";

import { createUser, findUserByEmail } from "@/db/repositories/users";
import { signupInputSchema } from "./schema";

type Ok = { ok: true; userId: string };
type Fail = {
  ok: false;
  error: { code: string; message: string; field?: string | undefined };
};
export type SignupResult = Ok | Fail;

export async function signupAction(raw: unknown): Promise<SignupResult> {
  const parsed = signupInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        field: typeof first?.path[0] === "string" ? first.path[0] : undefined,
        message: first?.message ?? "Invalid input",
      },
    };
  }
  try {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return {
        ok: false,
        error: {
          code: "EMAIL_TAKEN",
          field: "email",
          message: "An account with this email already exists.",
        },
      };
    }
    const user = await createUser(parsed.data);
    return { ok: true, userId: user.id };
  } catch (err) {
    const e = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (e?.code === 11000 && e.keyPattern?.email) {
      return {
        ok: false,
        error: {
          code: "EMAIL_TAKEN",
          field: "email",
          message: "An account with this email already exists.",
        },
      };
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: { code: "UNKNOWN", message } };
  }
}
