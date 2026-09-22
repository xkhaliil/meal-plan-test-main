"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState, useEffect } from "react";

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
}

export default function RecipesPage() {
  console.log("[CHAOS render] RecipesPage");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(data.recipes));
  }, []);

  function handleSaveRecipe() {}

  async function handleDeleteRecipe(id: string) {
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="relative min-h-screen font-sans">
      <div className="absolute inset-0 z-0 bg-gray-50" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ChefLogo size={36} />
          Recipes
        </h1>
        <button
          onClick={handleSaveRecipe}
          className="bg-lime-400 text-black px-6 py-2 text-sm font-bold border-2 border-lime-600"
        >
          + Save Recipe
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border-2 border-orange-400 rounded-none p-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onDelete={handleDeleteRecipe}
            searchQuery={searchQuery}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function RecipeCard({
  recipe,
  onDelete,
  searchQuery: _searchQuery,
}: {
  recipe: Recipe;
  onDelete: (id: string) => void;
  searchQuery: string;
}) {
  console.log("[CHAOS render] RecipeCard", recipe.id);
  void _searchQuery;
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <a href={`/recipes/${recipe.id}`}>
          <h3 className="text-xl font-bold text-purple-700 mb-1">{recipe.title}</h3>
        </a>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex gap-4 text-xs text-gray-400 mb-3">
          <span>Prep: {recipe.prepTime}min</span>
          <span>Cook: {recipe.cookTime}min</span>
          <span>Serves: {recipe.servings}</span>
          {recipe.calories && <span>{recipe.calories} cal</span>}
        </div>
        {recipe.dietaryTags && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.dietaryTags.split(",").map((tag) => (
              <span
                key={tag}
                className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <a
            href={`/recipes/${recipe.id}`}
            className="bg-purple-600 text-white px-4 py-1.5 text-xs rounded-full"
          >
            View
          </a>
          <button
            onClick={() => onDelete(recipe.id)}
            className="bg-red-100 text-red-700 px-4 py-1.5 text-xs border border-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
