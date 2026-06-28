import { describe, expect, it } from "vitest";
import {
  buildCategoryIndex,
  predictCategory,
  tokenizeNote,
} from "./predict-category";

const history = (rows: Array<{ categoryId: string; note: string | null }>) =>
  rows.map((r, i) => ({ ...r, _idx: i }));

describe("tokenizeNote", () => {
  it("returns empty array for empty/null input", () => {
    expect(tokenizeNote(null)).toEqual([]);
    expect(tokenizeNote("")).toEqual([]);
    expect(tokenizeNote(undefined)).toEqual([]);
  });

  it("lowercases and splits on whitespace + punctuation", () => {
    expect(tokenizeNote("Uber to Office")).toEqual(["uber", "to", "office"]);
    expect(tokenizeNote("metro card, Bangalore")).toEqual([
      "metro",
      "card",
      "bangalore",
    ]);
    expect(tokenizeNote("Coffee@Blue Tokai")).toEqual([
      "coffee",
      "blue",
      "tokai",
    ]);
  });

  it("drops single-char tokens and pure numbers", () => {
    expect(tokenizeNote("a coffee 250")).toEqual(["coffee"]);
    expect(tokenizeNote("rs 200 tea")).toEqual(["rs", "tea"]);
  });
});

describe("buildCategoryIndex", () => {
  it("builds token → category counts", () => {
    const idx = buildCategoryIndex(
      history([
        { categoryId: "transport", note: "Uber" },
        { categoryId: "transport", note: "uber to airport" },
        { categoryId: "food", note: "swiggy biryani" },
      ]),
    );
    expect(idx.get("uber")?.get("transport")).toBe(2);
    expect(idx.get("airport")?.get("transport")).toBe(1);
    expect(idx.get("swiggy")?.get("food")).toBe(1);
  });

  it("ignores notes that have no usable tokens", () => {
    const idx = buildCategoryIndex(
      history([{ categoryId: "food", note: "100" }]),
    );
    expect(idx.size).toBe(0);
  });
});

describe("predictCategory", () => {
  const valid = new Set(["transport", "food", "shopping"]);
  const idx = buildCategoryIndex(
    history([
      { categoryId: "transport", note: "Uber to Office" },
      { categoryId: "transport", note: "uber" },
      { categoryId: "transport", note: "metro" },
      { categoryId: "food", note: "swiggy" },
      { categoryId: "food", note: "swiggy biryani" },
      { categoryId: "food", note: "lunch outside" },
      { categoryId: "shopping", note: "amazon" },
    ]),
  );

  it("returns null when note is empty / no signal", () => {
    expect(predictCategory(null, idx, valid)).toBe(null);
    expect(predictCategory("", idx, valid)).toBe(null);
    expect(predictCategory("totallyunseenword", idx, valid)).toBe(null);
  });

  it("matches a single strong token", () => {
    expect(predictCategory("uber to home", idx, valid)).toBe("transport");
    expect(predictCategory("Swiggy dinner", idx, valid)).toBe("food");
    expect(predictCategory("amazon order", idx, valid)).toBe("shopping");
  });

  it("ignores categories not in valid set", () => {
    const restricted = new Set(["food", "shopping"]);
    expect(predictCategory("uber", idx, restricted)).toBe(null);
  });

  it("tallies multiple tokens for the same category", () => {
    expect(predictCategory("uber metro", idx, valid)).toBe("transport");
  });

  it("returns null when score below minScore threshold", () => {
    // Token weights are normalized 0–1 per token. With only one weak hit,
    // a high threshold should reject the prediction.
    expect(predictCategory("biryani", idx, valid, 5)).toBe(null);
  });

  it("returns the strongest signal among competing tokens", () => {
    // "uber" appears 2× in transport, "biryani" 1× in food.
    // Both unique to their category → both score 1.0 individually.
    // The first one encountered keeps lead in tie; document that behavior.
    const result = predictCategory("uber biryani", idx, valid);
    expect(["transport", "food"]).toContain(result);
  });
});
