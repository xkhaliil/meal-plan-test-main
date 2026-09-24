"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Pagination from "@/app/components/Pagination";
import Reveal from "@/app/components/motion/Reveal";
import { getLenis } from "@/app/components/motion/SmoothScroll";
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
      {/* ---------- Masthead: the landing page's oversized display type ---------- */}
      <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px] sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brown/60">
              Your kitchen
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,9vw,128px)] uppercase leading-[0.88] text-brown">
              The catalog
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-brown/80">
              Everything you cook, in one place, ingredients, timings and tags,
              ready to drop into any week.
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-8">
            <div>
              <p className="font-display text-[clamp(3.5rem,8vw,96px)] leading-[0.8] text-red">
                {recipes.length}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brown/60">
                {recipes.length === 1 ? "recipe" : "recipes"} saved
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className={`btn h-14 px-8 text-base sm:h-[68px] sm:px-10 sm:text-lg ${
                showCreateForm ? "btn-secondary" : "btn-primary"
              }`}
            >
              {showCreateForm ? "Cancel" : "New recipe"}
            </button>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <section className="border-b-2 border-brown px-5 py-10 sm:px-[30px]">
          <div className="mx-auto max-w-7xl">
            <CreateRecipeForm
              onCreated={handleCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </section>
      )}

      {/* ---------- Filter band: sticks under the navbar on desktop ---------- */}
      <section className="z-10 border-b-2 border-brown bg-yellow px-5 py-4 sm:px-[30px] md:sticky md:top-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input h-12 w-full lg:max-w-xs"
            aria-label="Search recipes"
          />

          {cuisines.length > 0 && (
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1 lg:flex-1 lg:justify-center">
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

          <p className="shrink-0 text-xs uppercase tracking-[0.2em] text-brown/60">
            {countLabel}
          </p>
        </div>
      </section>

      {/* ---------- The grid ---------- */}
      <section id="recipe-grid" className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-7xl">
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
            {deleteError && <p className="mt-3 text-red">{deleteError}</p>}
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
      className={`tag h-9 shrink-0 px-4 py-0 text-[0.7rem] transition-colors ${
        active ? "bg-brown text-yellow" : "hover:bg-brown hover:text-yellow"
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
      <p className="font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] text-brown">
        {filtering ? "No matches" : "Nothing cooking yet"}
      </p>
      <p className="mt-5 max-w-[44ch] text-brown/70">
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
      <div className="h-56 animate-pulse border-b-2 border-brown bg-brown/10" />
      <div className="space-y-3 p-5">
        <div className="h-7 w-3/4 animate-pulse rounded-pill bg-brown/10" />
        <div className="h-4 w-full animate-pulse rounded-pill bg-brown/10" />
        <div className="h-4 w-2/3 animate-pulse rounded-pill bg-brown/10" />
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

    const res = await fetch("/api/recipes", {
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
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-brown pb-5">
        <div>
          <h2 className="font-display text-3xl uppercase leading-none text-brown sm:text-[44px]">
            New recipe
          </h2>
          <p className="mt-2 text-sm text-brown/70">
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
            Cuisine <span className="text-brown/55">(optional)</span>
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
            <span className="text-brown/55">(comma separated)</span>
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
            <span className="text-brown/55">
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
    <article className="card group relative isolate flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white">
      {/* One target for the whole card; the delete button sits above it. */}
      <Link
        href={`/recipes/${recipe.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${recipe.title}`}
      />

      <div className="relative h-56 overflow-hidden border-b-2 border-brown">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {recipe.cuisine && (
          <span className="tag absolute left-4 top-4 bg-yellow">
            {recipe.cuisine}
          </span>
        )}
        <span className="tag absolute bottom-4 right-4 bg-beige">
          {totalTime} min
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl uppercase leading-[1.05] break-words text-brown transition-colors group-hover:text-red">
          {recipe.title}
        </h3>
        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-brown/70">
          {recipe.description}
        </p>

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.7rem] uppercase tracking-[0.12em] text-brown/60">
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

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t-2 border-brown pt-4">
          <span className="text-sm uppercase tracking-[0.12em] text-brown/70 transition-colors group-hover:text-red">
            View recipe
          </span>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={onRequestDelete}
                className="relative z-20 rounded-pill border-2 border-transparent px-3 py-1 text-xs uppercase tracking-wide text-brown/55 transition-colors hover:border-red hover:text-red"
              >
                Delete
              </button>
            )}
            <span className="btn-circle h-11 w-11 text-base transition-colors group-hover:bg-brown group-hover:text-yellow">
              →
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
