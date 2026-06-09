export const CATEGORY_PALETTE = [
  { name: "pink", hex: "#F9C8D9" },
  { name: "peach", hex: "#FFD3B8" },
  { name: "butter", hex: "#FCE8B2" },
  { name: "mint", hex: "#C8E6D0" },
  { name: "sky", hex: "#C5DCEE" },
  { name: "lavender", hex: "#D8C7E8" },
  { name: "sand", hex: "#E8D5C4" },
  { name: "sage", hex: "#D4E4D8" },
] as const;

export type PaletteName = (typeof CATEGORY_PALETTE)[number]["name"];
export const PALETTE_HEXES = CATEGORY_PALETTE.map((p) => p.hex);
