"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { scaleAmount } from "@/lib/ingredients";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRecipeStore } from "@/lib/stores/recipeStore";
import { useMealPlanStore } from "@/lib/stores/mealPlanStore";
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
  userId: string;
  ingredients: { id: string; name: string; amount: string; unit: string }[];
  user: { name: string };
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

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [servings, setServings] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prepTime: "",
    cookTime: "",
    servingsField: "",
    cuisine: "",
    dietaryTags: "",
    ingredientsText: "",
  });
  const [editError, setEditError] = useState("");
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const router = useRouter();

  const plans = useMealPlanStore((s) => s.plans);
  const [planId, setPlanId] = useState("");
  const [day, setDay] = useState("monday");
  const [mealType, setMealType] = useState("dinner");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduled, setScheduled] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`, {
      headers: useAuthStore.getState().authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.recipe) {
          setRecipe(data.recipe);
          setServings(data.recipe.servings);
        } else setNotFound(true);
      })
      .catch(() => setNotFound(true));

    // Populates the "cook it this week" picker.
    useMealPlanStore.getState().fetchPlans();
  }, [id]);

  // Derived rather than synced, so no effect has to mirror it into state.
  const activePlanId = planId || plans[0]?.id || "";

  async function handleSchedule() {
    setScheduleError("");
    setScheduled(null);
    setScheduling(true);

    const result = await useMealPlanStore.getState().addMeal(activePlanId, {
      day,
      mealType,
      recipeId: id,
    });
    setScheduling(false);

    if (!result.ok) {
      setScheduleError(result.error ?? "Could not add it to that plan");
      return;
    }
    setScheduled(activePlanId);
  }

  function startEditing() {
    if (!recipe) return;
    setForm({
      title: recipe.title,
      description: recipe.description,
      prepTime: String(recipe.prepTime),
      cookTime: String(recipe.cookTime),
      servingsField: String(recipe.servings),
      cuisine: recipe.cuisine ?? "",
      dietaryTags: recipe.dietaryTags ?? "",
      ingredientsText: recipe.ingredients
        .map((i) => [i.name, i.amount, i.unit].filter(Boolean).join(", "))
        .join("\n"),
    });
    setEditError("");
    setEditing(true);
  }

  async function saveEdit() {
    setEditError("");
    setSavingEdit(true);

    // Same "name, amount, unit" shorthand the create form takes.
    const ingredients = form.ingredientsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, amount, unit] = line.split(",").map((p) => p.trim());
        return { name: name || line, amount: amount || "", unit: unit || "" };
      });

    const result = await useRecipeStore.getState().updateRecipe(id, {
      title: form.title,
      description: form.description,
      prepTime: Number(form.prepTime) || 0,
      cookTime: Number(form.cookTime) || 0,
      servings: Number(form.servingsField) || 1,
      cuisine: form.cuisine || null,
      dietaryTags: form.dietaryTags || null,
      ingredients,
    });
    setSavingEdit(false);
    setConfirmingSave(false);

    if (!result.ok || !result.recipe) {
      setEditError(result.error ?? "Could not save changes.");
      return;
    }
    const data = { recipe: result.recipe };

    // The response carries no `user`, so merge rather than replace.
    setRecipe((prev) => (prev ? { ...prev, ...data.recipe } : prev));
    setServings(data.recipe.servings);
    setChecked(new Set());
    setEditing(false);
  }

  async function deleteRecipe() {
    setDeleteError("");
    setDeleting(true);

    const result = await useRecipeStore.getState().deleteRecipe(id);
    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.error ?? "Could not delete it.");
      return;
    }
    router.push("/recipes");
  }

  function toggle(ingredientId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  }

  if (notFound) {
    return (
      <div className="px-5 py-24 text-center">
        <p className="font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] text-brown">
          Recipe not found
        </p>
        <p className="mt-5 text-brown/70">
          It may have been deleted from the catalog.
        </p>
        <Link href="/recipes" className="btn btn-primary mt-8">
          Back to the catalog
        </Link>
      </div>
    );
  }

  if (!recipe || servings === null) return <RecipeSkeleton />;

  const tags = (recipe.dietaryTags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const isOwner = currentUserId !== null && recipe.userId === currentUserId;
  const factor = servings / recipe.servings;
  const stats = [
    { label: "Prep", value: `${recipe.prepTime} min` },
    { label: "Cook", value: `${recipe.cookTime} min` },
    { label: "Total", value: `${recipe.prepTime + recipe.cookTime} min` },
    { label: "Calories", value: recipe.calories ? `${recipe.calories}` : "—" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 pb-24 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/recipes"
          className="text-xs uppercase tracking-[0.2em] text-brown/55 transition-colors hover:text-red"
        >
          ← The catalog
        </Link>

        {isOwner && !editing && (
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="tag h-9 px-4 transition-colors hover:bg-brown hover:text-yellow"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setDeleteError("");
                setConfirmingDelete(true);
              }}
              className="tag h-9 px-4 text-red transition-colors hover:border-red hover:bg-red hover:text-white"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* ---------- The dish ---------- */}
      <div className="relative mt-6 aspect-[3/2] w-full overflow-hidden rounded-card border-2 border-brown">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          priority
        />
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingSave(true);
          }}
          className="card mt-10 p-6 sm:p-8"
        >
          <h2 className="font-display text-2xl uppercase leading-none text-brown">
            Edit recipe
          </h2>

          {editError && <div className="alert-error mt-5">{editError}</div>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="edit-title">
                Title
              </label>
              <input
                id="edit-title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="edit-description">
                Description
              </label>
              <textarea
                id="edit-description"
                required
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="input resize-y"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <label className="label" htmlFor="edit-prep">
                  Prep (min)
                </label>
                <input
                  id="edit-prep"
                  type="number"
                  min={0}
                  value={form.prepTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prepTime: e.target.value }))
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-cook">
                  Cook (min)
                </label>
                <input
                  id="edit-cook"
                  type="number"
                  min={0}
                  value={form.cookTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cookTime: e.target.value }))
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-servings">
                  Serves
                </label>
                <input
                  id="edit-servings"
                  type="number"
                  min={1}
                  value={form.servingsField}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, servingsField: e.target.value }))
                  }
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="edit-cuisine">
                Cuisine
              </label>
              <input
                id="edit-cuisine"
                value={form.cuisine}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cuisine: e.target.value }))
                }
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-tags">
                Dietary tags{" "}
                <span className="text-brown/55">(comma separated)</span>
              </label>
              <input
                id="edit-tags"
                value={form.dietaryTags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dietaryTags: e.target.value }))
                }
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="edit-ingredients">
                Ingredients{" "}
                <span className="text-brown/55">
                  — one per line: name, amount, unit
                </span>
              </label>
              <textarea
                id="edit-ingredients"
                rows={6}
                value={form.ingredientsText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ingredientsText: e.target.value }))
                }
                className="input resize-y font-mono text-xs"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!editing && (
        <>
          {/* ---------- Title block ---------- */}
          <div className="mt-10 text-center">
            {recipe.cuisine && (
              <p className="text-xs uppercase tracking-[0.3em] text-red">
                {recipe.cuisine}
              </p>
            )}
            <h1 className="mt-4 font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] break-words text-brown">
              {recipe.title}
            </h1>
            <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-brown/75">
              {recipe.description}
            </p>

            {tags.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ---------- The numbers, set like a recipe card header ---------- */}
          <dl className="mt-10 grid grid-cols-2 border-y-2 border-brown py-6 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`px-2 text-center ${
                  i > 0 ? "border-l-2 border-brown/15" : ""
                } ${i === 2 ? "max-sm:border-l-0" : ""}`}
              >
                <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-brown/55">
                  {stat.label}
                </dt>
                <dd className="mt-2 font-display text-2xl leading-none text-brown">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* ---------- Ingredients ---------- */}
          <div className="mt-14">
            <RuledHeading>Ingredients</RuledHeading>

            {/* Scales every amount below. */}
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => setServings((s) => Math.max(1, (s ?? 1) - 1))}
                disabled={servings <= 1}
                aria-label="One fewer serving"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brown bg-beige text-brown transition-colors enabled:hover:bg-brown enabled:hover:text-yellow disabled:opacity-35"
              >
                −
              </button>
              <span className="min-w-28 text-center text-sm uppercase tracking-[0.15em] text-brown">
                Serves {servings}
              </span>
              <button
                onClick={() => setServings((s) => Math.min(24, (s ?? 1) + 1))}
                disabled={servings >= 24}
                aria-label="One more serving"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brown bg-beige text-brown transition-colors enabled:hover:bg-brown enabled:hover:text-yellow disabled:opacity-35"
              >
                +
              </button>
            </div>

            {factor !== 1 && (
              <p className="mt-3 text-center text-[0.7rem] uppercase tracking-[0.15em] text-red">
                Scaled from {recipe.servings}
              </p>
            )}

            <ul className="mt-8">
              {recipe.ingredients.map((ing) => {
                const done = checked.has(ing.id);
                const amount = [scaleAmount(ing.amount, factor), ing.unit]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <li
                    key={ing.id}
                    className="border-b-2 border-dotted border-brown/20"
                  >
                    <button
                      onClick={() => toggle(ing.id)}
                      aria-pressed={done}
                      className="flex w-full items-baseline gap-3 py-3.5 text-left"
                    >
                      <span
                        aria-hidden
                        className={`relative top-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-brown text-[0.55rem] ${
                          done ? "bg-brown text-yellow" : "bg-white"
                        }`}
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span
                        className={`leading-snug ${
                          done ? "text-brown/40 line-through" : "text-brown"
                        }`}
                      >
                        {ing.name}
                      </span>
                      <span className="flex-1" aria-hidden />
                      {amount && (
                        <span
                          className={`shrink-0 text-sm uppercase tracking-wide ${
                            done ? "text-brown/30" : "text-brown/60"
                          }`}
                        >
                          {amount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---------- Put it in a week ---------- */}
          <div className="mt-14">
            <RuledHeading>Cook it</RuledHeading>

            {plans.length === 0 ? (
              <div className="mt-7 text-center">
                <p className="text-brown/70">
                  Start a meal plan and this drops straight into it.
                </p>
                <Link href="/meal-plans" className="btn btn-primary mt-5">
                  New meal plan
                </Link>
              </div>
            ) : (
              <div className="mt-7">
                <div className="flex flex-wrap items-end justify-center gap-3">
                  <div className="min-w-44 flex-1">
                    <label className="label" htmlFor="schedule-plan">
                      Plan
                    </label>
                    <select
                      id="schedule-plan"
                      value={activePlanId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="input h-12"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="schedule-day">
                      Day
                    </label>
                    <select
                      id="schedule-day"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="input h-12"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="schedule-meal">
                      Meal
                    </label>
                    <select
                      id="schedule-meal"
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                      className="input h-12"
                    >
                      {MEAL_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSchedule}
                    disabled={scheduling || !activePlanId}
                    className="btn btn-primary h-12 px-7"
                  >
                    {scheduling ? "Adding..." : "Add to plan"}
                  </button>
                </div>

                {scheduleError && (
                  <div className="alert-error mt-4">{scheduleError}</div>
                )}

                {scheduled && (
                  <p className="mt-4 text-center text-sm text-brown">
                    Added to {day} {mealType}.{" "}
                    <Link
                      href={`/meal-plans/${scheduled}`}
                      className="text-red underline underline-offset-2"
                    >
                      Open the plan →
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-14 text-center text-xs uppercase tracking-[0.2em] text-brown/45">
        Added by {recipe.user.name}
      </p>

      <ConfirmDialog
        open={confirmingSave}
        busy={savingEdit}
        title="Save these changes?"
        confirmLabel="Save them"
        body={
          <p>
            <strong>{form.title}</strong> will be updated for everyone who can
            see it, and its ingredient list replaced with what you typed.
          </p>
        }
        onConfirm={saveEdit}
        onCancel={() => {
          if (!savingEdit) setConfirmingSave(false);
        }}
      />

      <ConfirmDialog
        open={confirmingDelete}
        destructive
        busy={deleting}
        title="Delete this recipe?"
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        body={
          <>
            <p>
              <strong>{recipe.title}</strong> will be removed from the catalog,
              along with its ingredients and any meal-plan slots it sits in.
              This can&apos;t be undone.
            </p>
            {deleteError && <p className="mt-3 text-red">{deleteError}</p>}
          </>
        }
        onConfirm={deleteRecipe}
        onCancel={() => {
          if (deleting) return;
          setConfirmingDelete(false);
          setDeleteError("");
        }}
      />
    </div>
  );
}

/** A centred heading with a rule running out either side of it. */
function RuledHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-5">
      <span className="h-0.5 flex-1 bg-brown/20" aria-hidden />
      <h2 className="font-display text-2xl uppercase leading-none text-brown">
        {children}
      </h2>
      <span className="h-0.5 flex-1 bg-brown/20" aria-hidden />
    </div>
  );
}

function RecipeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8" aria-hidden>
      <div className="h-4 w-28 animate-pulse rounded-pill bg-brown/10" />
      <div className="mt-6 aspect-[3/2] w-full animate-pulse rounded-card bg-brown/10" />
      <div className="mx-auto mt-10 h-14 w-2/3 animate-pulse rounded-card bg-brown/10" />
      <div className="mx-auto mt-5 h-5 w-full animate-pulse rounded-pill bg-brown/10" />
      <div className="mt-10 h-24 w-full animate-pulse rounded-card bg-brown/10" />
    </div>
  );
}
