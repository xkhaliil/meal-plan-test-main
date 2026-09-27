"use client";

import { create } from "zustand";
import { requestJson } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "@/lib/stores/toastStore";

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number | null;
  cuisine: string | null;
  dietaryTags: string | null;
  userId: string;
  user?: { name: string };
  ingredients: { id: string; name: string; amount: string; unit: string }[];
}

export interface RecipeOption {
  id: string;
  title: string;
}

interface Result {
  ok: boolean;
  error?: string;
}

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  loaded: boolean;

  /** id/title pairs for the "add to a plan" pickers. */
  options: RecipeOption[];

  fetchRecipes: () => Promise<void>;
  fetchOptions: () => Promise<void>;
  /** Puts a freshly created recipe at the top without a round trip. */
  addLocal: (recipe: Recipe) => void;
  updateRecipe: (
    id: string,
    body: unknown
  ) => Promise<Result & { recipe?: Recipe }>;
  deleteRecipe: (id: string) => Promise<Result>;
}

/**
 * The recipe catalog.
 *
 * Four pages fetched and mutated this list independently, each with its own
 * copy of the token handling and its own idea of what to do after a delete.
 * Keeping it here means a change made on the detail page is reflected in the
 * catalog without a refetch.
 */
export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  loading: false,
  loaded: false,
  options: [],

  fetchRecipes: async () => {
    set({ loading: true });
    const result = await requestJson<{ recipes?: Recipe[] }>(
      "/api/recipes",
      { headers: useAuthStore.getState().authHeaders() },
      "Could not load your recipes."
    );
    if (result.ok) set({ recipes: result.data.recipes ?? [] });
    else toast.error(result.error);
    set({ loaded: true, loading: false });
  },

  fetchOptions: async () => {
    const result = await requestJson<{ recipes?: RecipeOption[] }>(
      "/api/recipes?view=options",
      { headers: useAuthStore.getState().authHeaders() },
      "Could not load the recipe list."
    );
    // The picker simply stays empty; the page it sits on has already reported
    // anything worth reporting.
    if (result.ok) set({ options: result.data.recipes ?? [] });
  },

  addLocal: (recipe) => set({ recipes: [recipe, ...get().recipes] }),

  updateRecipe: async (id, body) => {
    const result = await requestJson<{ recipe?: Recipe }>(
      `/api/recipes/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...useAuthStore.getState().authHeaders(),
        },
        body: JSON.stringify(body),
      },
      "Could not save your changes."
    );

    if (!result.ok) return { ok: false, error: result.error };

    const updated = result.data.recipe;
    if (updated) {
      set({
        recipes: get().recipes.map((r) =>
          // The response carries no `user`, so merge rather than replace.
          r.id === id ? { ...r, ...updated } : r
        ),
      });
    }
    return { ok: true, recipe: updated };
  },

  deleteRecipe: async (id) => {
    const result = await requestJson(
      `/api/recipes/${id}`,
      { method: "DELETE", headers: useAuthStore.getState().authHeaders() },
      "Could not delete that recipe."
    );

    if (!result.ok) return { ok: false, error: result.error };

    set({
      recipes: get().recipes.filter((r) => r.id !== id),
      options: get().options.filter((r) => r.id !== id),
    });
    return { ok: true };
  },
}));
