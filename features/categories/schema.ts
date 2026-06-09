import { z } from "zod";
import { PALETTE_HEXES } from "@/lib/theme/palette";
import { ICON_NAMES } from "./lib/icons";

const iconValues = ICON_NAMES as [string, ...string[]];
const colorValues = PALETTE_HEXES as unknown as [string, ...string[]];

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Name must be 40 characters or fewer"),
  icon: z.enum(iconValues),
  color: z.enum(colorValues),
  type: z.enum(["Fixed", "Variable"]),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
