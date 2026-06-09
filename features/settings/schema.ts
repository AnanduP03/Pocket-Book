import { z } from "zod";

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
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
