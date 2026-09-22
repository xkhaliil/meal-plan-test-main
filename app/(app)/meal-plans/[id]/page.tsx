"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";

interface MealPlanRecipe {
  id: string;
  day: string;
  mealType: string;
  recipe: {
    id: string;
    title: string;
    imageUrl: string;
    ingredients: { name: string; amount: string; unit: string }[];
  };
}

interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  recipes: MealPlanRecipe[];
}

interface RecipeOption {
  id: string;
  title: string;
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export default function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/meal-plans/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.mealPlan) setMealPlan(data.mealPlan);
        else setLoadFailed(true);
      })
      .catch(() => setLoadFailed(true));

    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data.recipes ?? []);
        if (data.recipes?.length > 0) setSelectedRecipeId(data.recipes[0].id);
      });
  }, [id]);

  async function handleAddRecipe() {
    setError("");
    setAdding(true);
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/meal-plans/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        day: selectedDay,
        mealType: selectedMealType,
        recipeId: selectedRecipeId,
      }),
    });
    setAdding(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add that recipe");
      return;
    }

    const updated = await fetch(`/api/meal-plans/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await updated.json();
    setMealPlan(data.mealPlan);
  }

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink">Meal plan unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          This plan doesn&apos;t exist, or it belongs to another account.
        </p>
        <Link href="/meal-plans" className="btn btn-secondary mt-6">
          Back to meal plans
        </Link>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-line/60" />
        <div className="mt-8 h-24 w-full animate-pulse rounded-xl bg-line/50" />
      </div>
    );
  }

  const totalMeals = mealPlan.recipes.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/meal-plans"
        className="text-sm text-muted transition-colors hover:text-ink"
      >
        ← All meal plans
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{mealPlan.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Date(mealPlan.startDate).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}{" "}
            –{" "}
            {new Date(mealPlan.endDate).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {totalMeals} {totalMeals === 1 ? "meal" : "meals"} planned
          </p>
        </div>
      </div>

      <section className="card mt-8 p-5">
        <h2 className="text-sm font-semibold text-ink">Add a meal</h2>
        {error && <div className="alert-error mt-3">{error}</div>}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="add-day">
              Day
            </label>
            <select
              id="add-day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="input"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="add-meal">
              Meal
            </label>
            <select
              id="add-meal"
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              className="input"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="add-recipe">
              Recipe
            </label>
            <select
              id="add-recipe"
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="input"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddRecipe}
            disabled={adding || !selectedRecipeId}
            className="btn btn-primary"
          >
            {adding ? "Adding..." : "Add to plan"}
          </button>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day) => {
          const dayMeals = mealPlan.recipes.filter((r) => r.day === day);
          return (
            <div key={day} className="card flex flex-col p-4">
              <h3 className="font-display text-sm font-semibold capitalize text-ink">
                {day}
              </h3>
              <div className="mt-3 flex flex-1 flex-col gap-3">
                {MEAL_TYPES.map((meal) => {
                  const items = dayMeals.filter((r) => r.mealType === meal);
                  return (
                    <div key={meal}>
                      <p className="text-[0.65rem] uppercase tracking-wide text-subtle">
                        {meal}
                      </p>
                      {items.length === 0 ? (
                        <p className="mt-0.5 text-xs text-line">—</p>
                      ) : (
                        items.map((item) => (
                          <Link
                            key={item.id}
                            href={`/recipes/${item.recipe.id}`}
                            className="mt-1 block rounded-md bg-terracotta-soft px-2 py-1 text-xs leading-snug text-terracotta hover:bg-terracotta hover:text-white"
                          >
                            {item.recipe.title}
                          </Link>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
