import { z } from "zod";

export const savingsInputSchema = z.object({
  amountPaise: z.number().int().positive("Enter a positive amount"),
  effectiveDate: z.date(),
  note: z.string().trim().max(280).nullable(),
  /** When set, the deposit/withdrawal is scoped to a named goal — the
   *  per-goal balance moves up or down. When null, the entry lands in
   *  the "Unallocated" bucket (legacy / un-earmarked savings). */
  goalId: z.string().nullable(),
});

export type SavingsInput = z.infer<typeof savingsInputSchema>;
