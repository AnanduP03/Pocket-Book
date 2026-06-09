import { z } from "zod";

export const savingsInputSchema = z.object({
  amountPaise: z.number().int().positive("Enter a positive amount"),
  effectiveDate: z.date(),
  note: z.string().trim().max(280).nullable(),
});

export type SavingsInput = z.infer<typeof savingsInputSchema>;
