"use client";

import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/authStore";

export interface MealPlanRecipe {
  id: string;
  day: string;
  mealType: string;
  recipe: {
    id: string;
    title: string;
    imageUrl: string;
    ingredients?: { name: string; amount: string; unit: string }[];
  };
}

export interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  recipes: MealPlanRecipe[];
}

interface Result {
  ok: boolean;
  error?: string;
}

interface MealPlanState {
  plans: MealPlan[];
  loading: boolean;
  loaded: boolean;

  /** The plan currently open on the detail page. */
  current: MealPlan | null;
  currentError: boolean;

  fetchPlans: () => Promise<void>;
  fetchPlan: (id: string) => Promise<void>;
  createPlan: (body: {
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<Result>;
  updatePlan: (id: string, body: unknown) => Promise<Result>;
  deletePlan: (id: string) => Promise<Result>;

  addMeal: (
    planId: string,
    body: { day: string; mealType: string; recipeId: string }
  ) => Promise<Result>;
  removeMeal: (planId: string, entryId: string) => Promise<Result>;
}

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    ...useAuthStore.getState().authHeaders(),
  };
}

/**
 * Meal plans, both the list and whichever one is open.
 *
 * Deleting a plan from its detail page used to leave a stale card on the list
 * until that page refetched; the two views share one array now.
 */
export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  plans: [],
  loading: false,
  loaded: false,
  current: null,
  currentError: false,

  fetchPlans: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/meal-plans", {
        headers: useAuthStore.getState().authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      set({ plans: data.mealPlans ?? [], loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  fetchPlan: async (id) => {
    set({ current: null, currentError: false });
    try {
      const res = await fetch(`/api/meal-plans/${id}`, {
        headers: useAuthStore.getState().authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (data.mealPlan) set({ current: data.mealPlan });
      else set({ currentError: true });
    } catch {
      set({ currentError: true });
    }
  },

  createPlan: async (body) => {
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, "Could not create meal plan"),
      };
    }
    await get().fetchPlans();
    return { ok: true };
  },

  updatePlan: async (id, body) => {
    const res = await fetch(`/api/meal-plans/${id}`, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, `Could not save changes (${res.status}).`),
      };
    }

    const data = await res.json().catch(() => ({}));
    const updated = data.mealPlan;
    set({
      plans: get().plans.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      // The update response has no meals on it; keep the ones on screen.
      current:
        get().current?.id === id
          ? { ...get().current!, ...updated }
          : get().current,
    });
    return { ok: true };
  },

  deletePlan: async (id) => {
    const res = await fetch(`/api/meal-plans/${id}`, {
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
      plans: get().plans.filter((p) => p.id !== id),
      current: get().current?.id === id ? null : get().current,
    });
    return { ok: true };
  },

  addMeal: async (planId, body) => {
    const res = await fetch(`/api/meal-plans/${planId}`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, "Could not add that recipe"),
      };
    }
    // Refetch: the response is the entry alone, and the grid wants the recipe
    // joined onto it.
    await get().fetchPlan(planId);
    return { ok: true };
  },

  removeMeal: async (planId, entryId) => {
    const res = await fetch(`/api/meal-plans/${planId}/entries/${entryId}`, {
      method: "DELETE",
      headers: useAuthStore.getState().authHeaders(),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: await readError(res, `Could not remove it (${res.status}).`),
      };
    }

    const current = get().current;
    if (current?.id === planId) {
      set({
        current: {
          ...current,
          recipes: current.recipes.filter((r) => r.id !== entryId),
        },
      });
    }
    return { ok: true };
  },
}));
