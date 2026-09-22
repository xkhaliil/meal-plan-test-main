"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
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

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export default function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  console.log("[CHAOS render] MealPlanDetailPage", id);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/meal-plans/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMealPlan(data.mealPlan));

    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data.recipes);
        if (data.recipes.length > 0) setSelectedRecipeId(data.recipes[0].id);
      });
  }, [id]);

  async function handleAddRecipe() {
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

    if (res.ok) {
      const token2 = localStorage.getItem("token");
      const updated = await fetch(`/api/meal-plans/${id}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      const data = await updated.json();
      setMealPlan(data.mealPlan);
    }
  }

  if (!mealPlan) return null;

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0 bg-gray-50" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 font-sans flex items-center gap-2 flex-wrap">
        <ChefLogo size={36} />
        {mealPlan.name}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {new Date(mealPlan.startDate).toLocaleDateString()} -{" "}
        {new Date(mealPlan.endDate).toLocaleDateString()}
      </p>

      <div className="bg-white border border-gray-200 p-4 rounded mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-3">Add Recipe</h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="border border-gray-300 p-2 text-sm rounded"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Meal</label>
            <select
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              className="border border-gray-300 p-2 text-sm rounded"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Recipe</label>
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="border border-gray-300 p-2 text-sm rounded"
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
            className="bg-lime-500 text-black px-4 py-2 text-sm font-bold"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => (
          <div key={day} className="bg-white border border-gray-200 p-3 rounded min-h-[200px]">
            <h3 className="text-sm font-bold text-gray-700 mb-2 capitalize">
              {day}
            </h3>
            {MEAL_TYPES.map((meal) => {
              const items = mealPlan.recipes.filter(
                (r) => r.day === day && r.mealType === meal
              );
              return (
                <div key={meal} className="mb-2">
                  <p className="text-xs text-gray-400 capitalize">{meal}</p>
                  {items.map((item) => (
                    <p key={item.id} className="text-xs text-purple-700 truncate">
                      {item.recipe.title}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
