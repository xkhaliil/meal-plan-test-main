import { describe, expect, it } from "vitest";
import { validateRecipeInput } from "../recipeInput";

/**
 * This validator is the only thing standing between a model's tool call and a
 * row in the database, so the cases that matter are the malformed ones.
 */
const valid = {
  title: "Test dish",
  description: "Something to cook",
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  ingredients: [{ name: "Salt", amount: "1", unit: "tsp" }],
};

describe("validateRecipeInput", () => {
  it("accepts a complete payload", () => {
    const result = validateRecipeInput({ ...valid });
    expect("error" in result).toBe(false);
  });

  it("rejects missing required fields", () => {
    for (const key of ["title", "description", "ingredients"] as const) {
      const body: Record<string, unknown> = { ...valid };
      delete body[key];
      expect(validateRecipeInput(body)).toHaveProperty("error");
    }
  });

  it("rejects a blank title", () => {
    expect(validateRecipeInput({ ...valid, title: "   " })).toHaveProperty(
      "error"
    );
  });

  it("rejects ingredients that aren't a list", () => {
    expect(
      validateRecipeInput({ ...valid, ingredients: "salt, pepper" })
    ).toHaveProperty("error");
  });

  it("in partial mode, only validates what was sent", () => {
    const result = validateRecipeInput({ title: "Renamed" }, { partial: true });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.title).toBe("Renamed");
      // Absent fields stay undefined so an update can't blank them out.
      expect(result.description).toBeUndefined();
      expect(result.ingredients).toBeUndefined();
    }
  });

  it("still rejects bad values in partial mode", () => {
    expect(
      validateRecipeInput({ title: "" }, { partial: true })
    ).toHaveProperty("error");
  });
});
