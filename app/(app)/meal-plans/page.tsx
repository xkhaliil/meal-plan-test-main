"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState, useEffect } from "react";

interface MealPlanRecipe {
  id: string;
  day: string;
  mealType: string;
  recipe: { id: string; title: string; imageUrl: string };
}

interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  recipes: MealPlanRecipe[];
}

export default function MealPlansPage() {
  console.log("[CHAOS render] MealPlansPage");
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/meal-plans", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMealPlans(data.mealPlans || []));
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0 bg-gray-50" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 font-sans flex items-center gap-2">
        <ChefLogo size={36} />
        Meal Plans
      </h1>

      {mealPlans.length === 0 && (
        <p className="text-gray-400 text-center mt-12">No meal plans yet.</p>
      )}

      <div className="space-y-6">
        {mealPlans.map((plan) => (
          <a
            key={plan.id}
            href={`/meal-plans/${plan.id}`}
            className="block bg-white border border-gray-200 p-6 rounded"
          >
            <h2 className="text-xl font-bold text-purple-700">{plan.name}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(plan.startDate).toLocaleDateString()} -{" "}
              {new Date(plan.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {plan.recipes.length} meals planned
            </p>
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}
