import { describe, it, expect } from "vitest";
import { normalizeNote } from "./normalize-note";

describe("normalizeNote", () => {
  it("returns null for empty string", () => {
    expect(normalizeNote("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeNote("   ")).toBeNull();
    expect(normalizeNote("\t\n  ")).toBeNull();
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeNote("  coffee  ")).toBe("coffee");
  });

  it("returns the string unchanged when there is no surrounding whitespace", () => {
    expect(normalizeNote("cab to office")).toBe("cab to office");
  });

  it("preserves internal whitespace", () => {
    expect(normalizeNote("  cab  to  office  ")).toBe("cab  to  office");
  });

  it("returns null for non-string input", () => {
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
    expect(normalizeNote(42)).toBeNull();
  });
});
