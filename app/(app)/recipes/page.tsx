"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Pagination from "@/app/components/Pagination";
import Reveal from "@/app/components/motion/Reveal";
import { getLenis } from "@/app/components/motion/SmoothScroll";
import { requestJson } from "@/lib/apiClient";
import { UNREADABLE_RESPONSE_MESSAGE } from "@/lib/apiMessage";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRecipeStore, type Recipe } from "@/lib/stores/recipeStore";
import { useState, useEffect } from "react";

/** Three full rows of the three-column grid. */
const PAGE_SIZE = 9;

export default function RecipesPage() {
  const recipes = useRecipeStore((s) => s.recipes);
  const loading = useRecipeStore((s) => s.loading);
  const [searchQuery, setSearchQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    useRecipeStore.getState().fetchRecipes();
  }, []);

  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  function handleCreated(recipe: Recipe) {
    useRecipeStore.getState().addLocal(recipe);
    setShowCreateForm(false);
    // A filter that hides the recipe you just saved reads as a failed save.
    setCuisineFilter(null);
    setSearchQuery("");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    setDeleting(true);

    const result = await useRecipeStore
      .getState()
      .deleteRecipe(pendingDelete.id);
    setDeleting(false);

    if (!result.ok) {
      setDeleteError(result.error ?? "Could not delete it.");
      return;
    }
    setPendingDelete(null);
  }

  const cuisines = Array.from(
    new Set(recipes.map((r) => r.cuisine).filter((c): c is string => !!c))
  ).sort();

  const query = searchQuery.trim().toLowerCase();
  const filteredRecipes = recipes.filter((recipe) => {
    if (cuisineFilter && recipe.cuisine !== cuisineFilter) return false;
    if (!query) return true;
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.description.toLowerCase().includes(query) ||
      (recipe.cuisine ?? "").toLowerCase().includes(query)
    );
  });

  const filtering = query.length > 0 || cuisineFilter !== null;

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const [page, setPage] = useState(1);

  // A new search or cuisine belongs on page one — and page three of a
  // three-page catalog stops existing the moment you filter it down.
  const filterKey = `${query}|${cuisineFilter ?? ""}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  } else if (page > totalPages) {
    setPage(totalPages);
  }

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRecipes = filteredRecipes.slice(pageStart, pageStart + PAGE_SIZE);

  let countLabel: string;
  if (loading) {
    countLabel = "Loading";
  } else if (filteredRecipes.length === 0) {
    countLabel = filtering ? `0 of ${recipes.length}` : "Empty";
  } else if (totalPages > 1) {
    countLabel = `${pageStart + 1}–${pageStart + pageRecipes.length} of ${
      filteredRecipes.length
    }`;
  } else if (filtering) {
    countLabel = `${filteredRecipes.length} of ${recipes.length}`;
  } else {
    countLabel = `${recipes.length} total`;
  }

  function goToPage(next: number) {
    setPage(next);

    // Land on the top of the grid, not wherever the last page left you.
    const grid = document.getElementById("recipe-grid");
    if (!grid) return;
    const lenis = getLenis();
    if (lenis) {
      // Clears the navbar and the filter band that stick above it.
      lenis.scrollTo(grid, { offset: -160 });
    } else {
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="pb-20">
      {/* ---------- Masthead ---------- */}
      <section className="px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Your kitchen</p>
            <h1 className="mt-4 text-5xl tracking-tight sm:text-6xl">
              The catalog
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-zinc-400">
              Everything you cook, in one place, ingredients, timings and tags,
              ready to drop into any week.
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-6">
            <div>
              <p className="font-display text-5xl leading-none tracking-tight text-zinc-900">
                {recipes.length}
              </p>
              <p className="eyebrow mt-2">
                {recipes.length === 1 ? "recipe" : "recipes"} saved
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className={`btn ${
                showCreateForm ? "btn-secondary" : "btn-primary"
              }`}
            >
              {showCreateForm ? "Cancel" : "New recipe"}
            </button>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <CreateRecipeForm
              onCreated={handleCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </section>
      )}

      {/* ---------- Filter bar: a second frosted pill, stuck under the nav on desktop ---------- */}
      <section className="z-10 px-5 sm:px-8 md:sticky md:top-[84px]">
        <div className="glass mx-auto flex max-w-6xl flex-col gap-3 rounded-3xl border border-zinc-200/70 p-3 shadow-[0_10px_15px_-3px_rgba(228,228,231,0.3)] lg:flex-row lg:items-center lg:justify-between lg:rounded-full lg:py-2 lg:pl-2 lg:pr-5">
          <input
            type="search"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input h-10 w-full rounded-full lg:max-w-xs"
            aria-label="Search recipes"
          />

          {cuisines.length > 0 && (
            <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 lg:flex-1">
              <FilterChip
                active={cuisineFilter === null}
                onClick={() => setCuisineFilter(null)}
              >
                All
              </FilterChip>
              {cuisines.map((cuisine) => (
                <FilterChip
                  key={cuisine}
                  active={cuisineFilter === cuisine}
                  onClick={() =>
                    setCuisineFilter((c) => (c === cuisine ? null : cuisine))
                  }
                >
                  {cuisine}
                </FilterChip>
              ))}
            </div>
          )}

          <p className="eyebrow shrink-0 px-2">{countLabel}</p>
        </div>
      </section>

      {/* ---------- The grid ---------- */}
      <section id="recipe-grid" className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <EmptyState
              filtering={filtering}
              searchQuery={searchQuery}
              onReset={() => {
                setSearchQuery("");
                setCuisineFilter(null);
              }}
              onCreate={() => setShowCreateForm(true)}
            />
          ) : (
            <>
              <Reveal
                y={18}
                deps={[recipes.length > 0, page]}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {pageRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    canDelete={
                      currentUserId !== null && recipe.userId === currentUserId
                    }
                    onRequestDelete={() => {
                      setDeleteError("");
                      setPendingDelete(recipe);
                    }}
                  />
                ))}
              </Reveal>

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={goToPage}
              />
            </>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        busy={deleting}
        title="Delete this recipe?"
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        body={
          <>
            <p>
              <strong>{pendingDelete?.title}</strong> will be removed from the
              catalog, along with its ingredients and any meal-plan slots it
              sits in. This can&apos;t be undone.
            </p>
            {deleteError && <p className="mt-3 text-red-600">{deleteError}</p>}
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (deleting) return;
          setPendingDelete(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filtering,
  searchQuery,
  onReset,
  onCreate,
}: {
  filtering: boolean;
  searchQuery: string;
  onReset: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-20 text-center">
      <p className="font-display text-4xl tracking-tight text-zinc-900">
        {filtering ? "No matches" : "Nothing cooking yet"}
      </p>
      <p className="mt-4 max-w-[44ch] text-zinc-400">
        {filtering
          ? searchQuery
            ? `Nothing in the catalog matches “${searchQuery}”.`
            : "Nothing in the catalog matches that filter."
          : "Add the first thing you cook often, or let the Recipe Bot invent one for you."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {filtering ? (
          <button onClick={onReset} className="btn btn-primary">
            Clear filters
          </button>
        ) : (
          <>
            <button onClick={onCreate} className="btn btn-primary">
              New recipe
            </button>
            <Link href="/chat" className="btn btn-secondary">
              Ask Recipe Bot
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function RecipeCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
      <div className="space-y-3 p-5">
        <div className="h-7 w-3/4 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-4 w-full animate-pulse rounded-full bg-zinc-100" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-zinc-100" />
      </div>
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

    const result = await requestJson<{ recipe?: Recipe }>(
      "/api/recipes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...useAuthStore.getState().authHeaders(),
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
      },
      "Could not save that recipe."
    );
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.data.recipe) {
      setError(UNREADABLE_RESPONSE_MESSAGE);
      return;
    }

    onCreated(result.data.recipe);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <h2 className="text-3xl tracking-tight sm:text-4xl">New recipe</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Add something you cook often — you can schedule it into any week
            after.
          </p>
        </div>
      </div>

      {error && <div className="alert-error mt-5">{error}</div>}

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
            Cuisine <span className="text-zinc-500">(optional)</span>
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
            Dietary tags{" "}
            <span className="text-zinc-500">(comma separated)</span>
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
            Ingredients{" "}
            <span className="text-zinc-500">
              — one per line: name, amount, unit
            </span>
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

      <div className="mt-8 flex gap-3">
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
  onRequestDelete,
}: {
  recipe: Recipe;
  canDelete: boolean;
  onRequestDelete: () => void;
}) {
  const tags = (recipe.dietaryTags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <article className="card group relative isolate flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(24,24,27,0.25)]">
      {/* One target for the whole card; the delete button sits above it. */}
      <Link
        href={`/recipes/${recipe.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${recipe.title}`}
      />

      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        {recipe.cuisine && (
          <span className="tag absolute left-3 top-3 bg-white/90 text-zinc-700 backdrop-blur">
            {recipe.cuisine}
          </span>
        )}
        <span className="tag absolute bottom-3 right-3 bg-white/90 text-zinc-700 backdrop-blur">
          {totalTime} min
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words font-sans text-base font-semibold leading-snug tracking-normal text-zinc-900">
          {recipe.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500">
          {recipe.description}
        </p>

        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span>Serves {recipe.servings}</span>
          <span>
            {recipe.ingredients.length}{" "}
            {recipe.ingredients.length === 1 ? "ingredient" : "ingredients"}
          </span>
          {recipe.calories && <span>{recipe.calories} cal</span>}
        </p>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <span className="text-sm font-medium text-zinc-500 transition-colors group-hover:text-zinc-900">
            View recipe
          </span>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={onRequestDelete}
                className="relative z-20 rounded-full px-3 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                Delete
              </button>
            )}
            <span className="btn-circle h-9 w-9 text-sm transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white">
              →
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
