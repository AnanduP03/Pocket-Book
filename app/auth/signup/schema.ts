import { z } from "zod";

export const signupInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
});

export type SignupInput = z.infer<typeof signupInputSchema>;
