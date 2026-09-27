"use client";

import { create } from "zustand";
import { requestJson } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "@/lib/stores/toastStore";

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
    const result = await requestJson<{ mealPlans?: MealPlan[] }>(
      "/api/meal-plans",
      { headers: useAuthStore.getState().authHeaders() },
      "Could not load your meal plans."
    );
    if (result.ok) set({ plans: result.data.mealPlans ?? [] });
    else toast.error(result.error);
    set({ loaded: true, loading: false });
  },

  fetchPlan: async (id) => {
    set({ current: null, currentError: false });
    const result = await requestJson<{ mealPlan?: MealPlan }>(
      `/api/meal-plans/${id}`,
      { headers: useAuthStore.getState().authHeaders() },
      "Could not load that meal plan."
    );
    // The page renders its own failed state, so no toast on top of it.
    if (result.ok && result.data.mealPlan)
      set({ current: result.data.mealPlan });
    else set({ currentError: true });
  },

  createPlan: async (body) => {
    const result = await requestJson(
      "/api/meal-plans",
      { method: "POST", headers: jsonHeaders(), body: JSON.stringify(body) },
      "Could not create that meal plan."
    );
    if (!result.ok) return { ok: false, error: result.error };
    await get().fetchPlans();
    return { ok: true };
  },

  updatePlan: async (id, body) => {
    const result = await requestJson<{ mealPlan?: MealPlan }>(
      `/api/meal-plans/${id}`,
      { method: "PUT", headers: jsonHeaders(), body: JSON.stringify(body) },
      "Could not save your changes."
    );
    if (!result.ok) return { ok: false, error: result.error };

    const updated = result.data.mealPlan;
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
    const result = await requestJson(
      `/api/meal-plans/${id}`,
      { method: "DELETE", headers: useAuthStore.getState().authHeaders() },
      "Could not delete that meal plan."
    );
    if (!result.ok) return { ok: false, error: result.error };
    set({
      plans: get().plans.filter((p) => p.id !== id),
      current: get().current?.id === id ? null : get().current,
    });
    return { ok: true };
  },

  addMeal: async (planId, body) => {
    const result = await requestJson(
      `/api/meal-plans/${planId}`,
      { method: "POST", headers: jsonHeaders(), body: JSON.stringify(body) },
      "Could not add that recipe."
    );
    if (!result.ok) return { ok: false, error: result.error };
    // Refetch: the response is the entry alone, and the grid wants the recipe
    // joined onto it.
    await get().fetchPlan(planId);
    return { ok: true };
  },

  removeMeal: async (planId, entryId) => {
    const result = await requestJson(
      `/api/meal-plans/${planId}/entries/${entryId}`,
      { method: "DELETE", headers: useAuthStore.getState().authHeaders() },
      "Could not remove that meal."
    );
    if (!result.ok) return { ok: false, error: result.error };

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
