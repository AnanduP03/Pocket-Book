import { z } from "zod";

export const variableInputSchema = z.object({
  date: z.date(),
  amountPaise: z.number().int().positive("Enter a positive amount"),
  currency: z.string().length(3),
  categoryId: z.string().min(1, "Pick a category"),
  note: z.string().trim().max(280).nullable(),
  tags: z
    .array(z.string().trim().min(1).max(24))
    .max(6, "Up to 6 tags")
    .optional(),
});

export type VariableInput = z.infer<typeof variableInputSchema>;
