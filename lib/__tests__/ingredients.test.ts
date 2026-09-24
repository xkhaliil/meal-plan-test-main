import { describe, expect, it } from "vitest";
import { formatQuantity, leadingQuantity, scaleAmount } from "../ingredients";

describe("leadingQuantity", () => {
  it("reads whole numbers, decimals, fractions and mixed numbers", () => {
    expect(leadingQuantity("2")).toEqual({ value: 2, rest: "" });
    expect(leadingQuantity("2.5")).toEqual({ value: 2.5, rest: "" });
    expect(leadingQuantity("1/2")).toEqual({ value: 0.5, rest: "" });
    expect(leadingQuantity("1 1/2")).toEqual({ value: 1.5, rest: "" });
  });

  it("keeps whatever follows the number", () => {
    expect(leadingQuantity("4 cloves")).toEqual({ value: 4, rest: "cloves" });
  });

  it("returns null when there is no number to scale", () => {
    expect(leadingQuantity("a pinch")).toBeNull();
    expect(leadingQuantity("")).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("prefers fractions over decimals", () => {
    expect(formatQuantity(0.5)).toBe("½");
    expect(formatQuantity(1.5)).toBe("1 ½");
    expect(formatQuantity(0.75)).toBe("¾");
  });

  it("drops the fraction when the value is whole", () => {
    expect(formatQuantity(3)).toBe("3");
  });

  it("falls back to two decimals for anything not on an eighth", () => {
    expect(formatQuantity(2 / 3)).toBe("0.67");
  });
});

describe("scaleAmount", () => {
  it("scales numeric amounts", () => {
    expect(scaleAmount("2", 2)).toBe("4");
    expect(scaleAmount("1", 0.5)).toBe("½");
    expect(scaleAmount("1/2", 2)).toBe("1");
    expect(scaleAmount("1 1/2", 2)).toBe("3");
    expect(scaleAmount("3", 1.5)).toBe("4 ½");
  });

  it("keeps the unit attached", () => {
    expect(scaleAmount("4 cloves", 0.5)).toBe("2 cloves");
  });

  it("leaves unparseable amounts exactly as written", () => {
    expect(scaleAmount("a pinch", 3)).toBe("a pinch");
    expect(scaleAmount("to taste", 0.5)).toBe("to taste");
  });

  it("is a no-op at the original serving count", () => {
    expect(scaleAmount("1 1/2", 1)).toBe("1 1/2");
    expect(scaleAmount("", 2)).toBe("");
  });
});
