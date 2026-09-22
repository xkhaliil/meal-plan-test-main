"use client";

import Image from "next/image";
import Link from "next/link";
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
  userId: string;
  user?: { name: string };
  ingredients: { id: string; name: string; amount: string; unit: string }[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data.recipes ?? []);

        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;
        try {
          setCurrentUserId(JSON.parse(storedUser).id ?? null);
        } catch {
          /* malformed cache — treat as signed-out for delete affordances */
        }
      })
      .catch(() => {});
  }, []);

  function handleCreated(recipe: Recipe) {
    setRecipes((prev) => [recipe, ...prev]);
    setShowCreateForm(false);
  }

  async function handleDeleteRecipe(id: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/recipes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredRecipes = query
    ? recipes.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          recipe.description.toLowerCase().includes(query) ||
          (recipe.cuisine ?? "").toLowerCase().includes(query)
      )
    : recipes;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Recipes</h1>
          <p className="mt-1 text-sm text-muted">
            Your catalog — everything you can build a week around.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className={showCreateForm ? "btn btn-secondary" : "btn btn-primary"}
        >
          {showCreateForm ? "Cancel" : "New recipe"}
        </button>
      </div>

      {showCreateForm && (
        <CreateRecipeForm
          onCreated={handleCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="relative mt-8 max-w-sm">
        <input
          type="search"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          aria-label="Search recipes"
        />
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <p className="text-sm text-muted">
            {recipes.length === 0
              ? "No recipes yet. Create one, or ask the Recipe Bot for an idea."
              : `No recipes match “${searchQuery}”.`}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              canDelete={currentUserId !== null && recipe.userId === currentUserId}
              onDelete={handleDeleteRecipe}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRecipeForm({
  onCreated,
  onCancel,
}: {
  onCreated: (recipe: Recipe) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("10");
  const [cookTime, setCookTime] = useState("20");
  const [servings, setServings] = useState("4");
  const [cuisine, setCuisine] = useState("");
  const [dietaryTags, setDietaryTags] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const ingredients = ingredientsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, amount, unit] = line.split(",").map((p) => p.trim());
        return { name: name || line, amount: amount || "", unit: unit || "" };
      });

    const token = localStorage.getItem("token");
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        prepTime: Number(prepTime) || 0,
        cookTime: Number(cookTime) || 0,
        servings: Number(servings) || 1,
        cuisine: cuisine || null,
        dietaryTags: dietaryTags || null,
        ingredients,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not save recipe");
      return;
    }

    onCreated(data.recipe);
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 p-6">
      <h2 className="text-lg font-semibold text-ink">New recipe</h2>
      <p className="mt-1 text-sm text-muted">
        Add something you cook often — you can schedule it into any week after.
      </p>

      {error && <div className="alert-error mt-4">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="recipe-title">
            Title
          </label>
          <input
            id="recipe-title"
            required
            placeholder="Lemon herb roast chicken"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="recipe-description">
            Description
          </label>
          <textarea
            id="recipe-description"
            required
            rows={2}
            placeholder="What makes this one worth cooking?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-y"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <div>
            <label className="label" htmlFor="recipe-prep">
              Prep (min)
            </label>
            <input
              id="recipe-prep"
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="recipe-cook">
              Cook (min)
            </label>
            <input
              id="recipe-cook"
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="recipe-servings">
              Serves
            </label>
            <input
              id="recipe-servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="recipe-cuisine">
            Cuisine <span className="text-subtle">(optional)</span>
          </label>
          <input
            id="recipe-cuisine"
            placeholder="Italian"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="recipe-tags">
            Dietary tags <span className="text-subtle">(comma separated)</span>
          </label>
          <input
            id="recipe-tags"
            placeholder="vegetarian, gluten-free"
            value={dietaryTags}
            onChange={(e) => setDietaryTags(e.target.value)}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="recipe-ingredients">
            Ingredients <span className="text-subtle">— one per line: name, amount, unit</span>
          </label>
          <textarea
            id="recipe-ingredients"
            rows={4}
            placeholder={"Chicken thighs, 4, pieces\nOlive oil, 2, tbsp"}
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            className="input resize-y font-mono text-xs"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "Save recipe"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RecipeCard({
  recipe,
  canDelete,
  onDelete,
}: {
  recipe: Recipe;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const tags = (recipe.dietaryTags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_2px_16px_rgba(28,25,23,0.06)]">
      <Link href={`/recipes/${recipe.id}`} className="relative block h-44 overflow-hidden">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/recipes/${recipe.id}`}>
          <h3 className="font-display text-lg font-semibold text-ink hover:text-terracotta">
            {recipe.title}
          </h3>
        </Link>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{recipe.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
          <span>{recipe.prepTime + recipe.cookTime} min total</span>
          <span>Serves {recipe.servings}</span>
          {recipe.calories && <span>{recipe.calories} cal</span>}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-sm font-medium text-terracotta hover:text-terracotta-dark"
          >
            View recipe →
          </Link>
          {canDelete && (
            <button
              onClick={() => onDelete(recipe.id)}
              className="text-xs text-subtle transition-colors hover:text-[#b3261e]"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
