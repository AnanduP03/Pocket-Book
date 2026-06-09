import { z } from "zod";

export const fixedInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(60),
    amountPaise: z.number().int().positive("Enter a positive amount"),
    categoryId: z.string().min(1, "Pick a category"),
    isActive: z.boolean(),
    isAutoDebit: z.boolean(),
    startDate: z.date(),
    intervalValue: z.number().int().min(1).max(365),
    intervalUnit: z.enum(["day", "week", "month", "year"]),
    endDate: z.date().nullable(),
    note: z.string().trim().max(280).nullable(),
  })
  .refine(
    (data) =>
      !data.endDate || data.endDate.getTime() >= data.startDate.getTime(),
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export type FixedInput = z.infer<typeof fixedInputSchema>;
