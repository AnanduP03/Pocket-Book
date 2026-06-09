import { z } from "zod";

export const variableInputSchema = z.object({
  date: z.date(),
  amountPaise: z.number().int().positive("Enter a positive amount"),
  currency: z.string().length(3),
  categoryId: z.string().min(1, "Pick a category"),
  note: z.string().trim().max(280).nullable(),
});

export type VariableInput = z.infer<typeof variableInputSchema>;
