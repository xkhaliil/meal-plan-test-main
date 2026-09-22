"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState, useEffect, use } from "react";

interface Recipe {
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
  ingredients: { id: string; name: string; amount: string; unit: string }[];
  user: { name: string; email: string };
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  console.log("[CHAOS render] RecipeDetailPage", id);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => setRecipe(data.recipe));
  }, [id]);

  if (!recipe) return null;

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0 bg-stone-50" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 mx-auto max-w-4xl p-8 font-serif">
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        className="w-full h-[500px] object-cover mb-6"
      />

      <h1 className="text-5xl font-bold text-orange-700 mb-2 flex items-center gap-3 flex-wrap">
        <ChefLogo size={48} />
        {recipe.title}
      </h1>
      <p className="text-gray-600 text-lg mb-6">{recipe.description}</p>

      <div className="flex gap-8 mb-8 text-sm text-gray-500">
        <div>
          <span className="font-bold text-gray-800">Prep Time</span>
          <br />
          {recipe.prepTime} minutes
        </div>
        <div>
          <span className="font-bold text-gray-800">Cook Time</span>
          <br />
          {recipe.cookTime} minutes
        </div>
        <div>
          <span className="font-bold text-gray-800">Servings</span>
          <br />
          {recipe.servings}
        </div>
        {recipe.calories && (
          <div>
            <span className="font-bold text-gray-800">Calories</span>
            <br />
            {recipe.calories}
          </div>
        )}
        {recipe.cuisine && (
          <div>
            <span className="font-bold text-gray-800">Cuisine</span>
            <br />
            {recipe.cuisine}
          </div>
        )}
      </div>

      {recipe.dietaryTags && (
        <div className="mb-6">
          {recipe.dietaryTags.split(",").map((tag) => (
            <span
              key={tag}
              className="inline-block bg-lime-200 text-lime-900 text-xs px-3 py-1 mr-2 rounded"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ingredients</h2>
      <ul className="mb-8 space-y-2">
        {recipe.ingredients.map((ing) => (
          <li key={ing.id} className="flex gap-2 text-gray-700">
            <span className="font-semibold">
              {ing.amount} {ing.unit}
            </span>
            <span>{ing.name}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-400">
        Created by {recipe.user.name}
      </p>
      </div>
    </div>
  );
}
