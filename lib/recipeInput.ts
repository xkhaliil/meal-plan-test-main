const MAX_TITLE_LEN = 200;
const MAX_DESC_LEN = 5000;
const MAX_CUISINE_LEN = 100;
const MAX_INGREDIENT_FIELD_LEN = 100;
const MAX_INGREDIENTS = 100;

export interface ValidatedIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ValidatedRecipeFields {
  title?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  calories?: number | null;
  cuisine?: string | null;
  dietaryTags?: string | null;
  ingredients?: ValidatedIngredient[];
}

export type RecipeValidationResult = { error: string } | ValidatedRecipeFields;

function toNonNegativeInt(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

/**
 * Validates/coerces a recipe payload from an untrusted source (API body or an
 * LLM tool call). With `partial: true`, only fields present in `body` are
 * validated/returned (used for PUT, where Prisma treats an omitted key as
 * "don't change this field"). Optional schema fields (calories/cuisine/
 * dietaryTags) are only ever validated when present, in either mode.
 */
export function validateRecipeInput(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): RecipeValidationResult {
  const result: ValidatedRecipeFields = {};
  const partial = opts.partial ?? false;

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "title is required" };
    }
    result.title = body.title.trim().slice(0, MAX_TITLE_LEN);
  }

  if (body.description !== undefined || !partial) {
    if (typeof body.description !== "string") {
      return { error: "description is required" };
    }
    result.description = body.description.trim().slice(0, MAX_DESC_LEN);
  }

  for (const key of ["prepTime", "cookTime", "servings"] as const) {
    if (body[key] !== undefined || !partial) {
      const n = toNonNegativeInt(body[key]);
      if (n === undefined) {
        return { error: `${key} must be a non-negative number` };
      }
      result[key] = n;
    }
  }

  if (body.calories !== undefined) {
    if (body.calories === null) {
      result.calories = null;
    } else {
      const n = toNonNegativeInt(body.calories);
      if (n === undefined) return { error: "calories must be a non-negative number" };
      result.calories = n;
    }
  }

  if (body.cuisine !== undefined) {
    result.cuisine =
      body.cuisine === null
        ? null
        : String(body.cuisine).trim().slice(0, MAX_CUISINE_LEN) || null;
  }

  if (body.dietaryTags !== undefined) {
    if (body.dietaryTags === null) {
      result.dietaryTags = null;
    } else if (Array.isArray(body.dietaryTags)) {
      result.dietaryTags =
        body.dietaryTags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .join(",") || null;
    } else if (typeof body.dietaryTags === "string") {
      result.dietaryTags = body.dietaryTags.trim() || null;
    } else {
      return { error: "dietaryTags must be a string or array of strings" };
    }
  }

  if (body.ingredients !== undefined || !partial) {
    const raw = body.ingredients;
    if (!Array.isArray(raw)) {
      return { error: "ingredients must be an array" };
    }
    if (raw.length > MAX_INGREDIENTS) {
      return { error: `ingredients cannot exceed ${MAX_INGREDIENTS} items` };
    }
    const ingredients: ValidatedIngredient[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") {
        return { error: "each ingredient must be an object" };
      }
      const rec = item as Record<string, unknown>;
      const name =
        typeof rec.name === "string"
          ? rec.name.trim().slice(0, MAX_INGREDIENT_FIELD_LEN)
          : "";
      if (!name) return { error: "each ingredient needs a name" };
      const amount =
        rec.amount === undefined || rec.amount === null
          ? ""
          : String(rec.amount).trim().slice(0, MAX_INGREDIENT_FIELD_LEN);
      const unit =
        rec.unit === undefined || rec.unit === null
          ? ""
          : String(rec.unit).trim().slice(0, MAX_INGREDIENT_FIELD_LEN);
      ingredients.push({ name, amount, unit });
    }
    result.ingredients = ingredients;
  }

  return result;
}
