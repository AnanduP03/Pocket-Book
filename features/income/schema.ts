import { z } from "zod";

export const incomeInputSchema = z.object({
  amountPaise: z.number().int().positive("Enter a positive amount"),
  effectiveDate: z.date(),
  note: z.string().trim().max(280).nullable(),
});

export type IncomeInput = z.infer<typeof incomeInputSchema>;
