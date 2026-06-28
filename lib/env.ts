import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters (use `openssl rand -base64 32`)",
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([k, v]) => `  ${k}: ${(v ?? []).join(", ")}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables. See .env.local.example.\n${fields}`,
  );
}

export const env = parsed.data;
