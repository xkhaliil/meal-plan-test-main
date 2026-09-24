"use client";

import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/authStore";

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

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
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
    try {
      const res = await fetch("/api/recipes", {
        headers: useAuthStore.getState().authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      set({ recipes: data.recipes ?? [], loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  fetchOptions: async () => {
    try {
      const res = await fetch("/api/recipes?view=options", {
        headers: useAuthStore.getState().authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      set({ options: data.recipes ?? [] });
    } catch {
      /* the picker simply stays empty */
    }
  },

  addLocal: (recipe) => set({ recipes: [recipe, ...get().recipes] }),

  updateRecipe: async (id, body) => {
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...useAuthStore.getState().authHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, `Could not save changes (${res.status}).`),
      };
    }

    const data = await res.json().catch(() => ({}));
    const updated: Recipe | undefined = data.recipe;
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
    const res = await fetch(`/api/recipes/${id}`, {
      method: "DELETE",
      headers: useAuthStore.getState().authHeaders(),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, `Could not delete it (${res.status}).`),
      };
    }

    set({
      recipes: get().recipes.filter((r) => r.id !== id),
      options: get().options.filter((r) => r.id !== id),
    });
    return { ok: true };
  },
}));
