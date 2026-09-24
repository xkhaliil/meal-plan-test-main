"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Pagination from "@/app/components/Pagination";
import Reveal from "@/app/components/motion/Reveal";
import { getLenis } from "@/app/components/motion/SmoothScroll";
import { useRouter } from "next/navigation";
import {
  useMealPlanStore,
  type MealPlan,
  type MealPlanRecipe,
} from "@/lib/stores/mealPlanStore";
import { useRecipeStore } from "@/lib/stores/recipeStore";
import { Fragment, useState, useEffect, use } from "react";

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
const TOTAL_SLOTS = DAYS.length * MEAL_TYPES.length;
/** Six rows of the three-column shopping list. */
const LIST_PAGE_SIZE = 18;

function planStatus(plan: MealPlan) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(plan.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(plan.endDate);
  end.setHours(23, 59, 59, 999);

  if (end.getTime() < today.getTime())
    return { label: "Finished", style: "bg-transparent text-brown/60" };
  if (start.getTime() > today.getTime())
    return { label: "Upcoming", style: "bg-sky text-brown" };
  return { label: "This week", style: "bg-green text-white" };
}

/**
 * Every ingredient of every scheduled meal, folded together by name. Amounts
 * are listed rather than summed — "2 cups" and "1 tbsp" of the same thing
 * can't be added up honestly.
 */
function shoppingList(plan: MealPlan) {
  const items = new Map<string, { name: string; amounts: string[] }>();

  for (const entry of plan.recipes) {
    for (const ingredient of entry.recipe.ingredients ?? []) {
      const name = ingredient.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const amount = [ingredient.amount, ingredient.unit]
        .filter(Boolean)
        .join(" ")
        .trim();

      const existing = items.get(key) ?? { name, amounts: [] };
      if (amount) existing.amounts.push(amount);
      items.set(key, existing);
    }
  }

  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const mealPlan = useMealPlanStore((s) => s.current);
  const loadFailed = useMealPlanStore((s) => s.currentError);
  const recipes = useRecipeStore((s) => s.options);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [listPage, setListPage] = useState(1);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [editError, setEditError] = useState("");
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmingDeletePlan, setConfirmingDeletePlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  const [pendingRemove, setPendingRemove] = useState<MealPlanRecipe | null>(
    null
  );
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const router = useRouter();

  useEffect(() => {
    useMealPlanStore.getState().fetchPlan(id);
    useRecipeStore.getState().fetchOptions();
  }, [id]);

  // Falls back to the first recipe until the user picks one.
  const activeRecipeId = selectedRecipeId || recipes[0]?.id || "";

  async function handleAddRecipe() {
    setError("");
    setAdding(true);
    const result = await useMealPlanStore.getState().addMeal(id, {
      day: selectedDay,
      mealType: selectedMealType,
      recipeId: activeRecipeId,
    });
    setAdding(false);
    if (!result.ok) setError(result.error ?? "Could not add that recipe");
  }

  /** yyyy-mm-dd, which is what a date input wants. */
  function isoDay(value: string) {
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function startEditing() {
    if (!mealPlan) return;
    setForm({
      name: mealPlan.name,
      startDate: isoDay(mealPlan.startDate),
      endDate: isoDay(mealPlan.endDate),
    });
    setEditError("");
    setEditing(true);
  }

  async function saveEdit() {
    setEditError("");
    setSavingEdit(true);

    const result = await useMealPlanStore.getState().updatePlan(id, form);
    setSavingEdit(false);
    setConfirmingSave(false);

    if (!result.ok) {
      setEditError(result.error ?? "Could not save changes.");
      return;
    }
    setEditing(false);
  }

  async function deletePlan() {
    setPlanError("");
    setDeletingPlan(true);

    const result = await useMealPlanStore.getState().deletePlan(id);
    if (!result.ok) {
      setDeletingPlan(false);
      setPlanError(result.error ?? "Could not delete it.");
      return;
    }
    router.push("/meal-plans");
  }

  async function removeEntry() {
    if (!pendingRemove) return;
    setRemoveError("");
    setRemoving(true);

    const result = await useMealPlanStore
      .getState()
      .removeMeal(id, pendingRemove.id);
    setRemoving(false);

    if (!result.ok) {
      setRemoveError(result.error ?? "Could not remove it.");
      return;
    }
    setPendingRemove(null);
  }

  /** Clicking an empty slot aims the picker at it. */
  function aimAt(day: string, mealType: string) {
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setError("");
  }

  function toggleBought(name: string) {
    setBought((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (loadFailed) {
    return (
      <div className="px-5 py-24 text-center sm:px-[30px]">
        <p className="font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] text-brown">
          Plan unavailable
        </p>
        <p className="mt-5 text-brown/70">
          This plan doesn&apos;t exist, or it belongs to another account.
        </p>
        <Link href="/meal-plans" className="btn btn-primary mt-8">
          Back to meal plans
        </Link>
      </div>
    );
  }

  if (!mealPlan) return <PlanSkeleton />;

  const status = planStatus(mealPlan);
  const filled = new Set(
    mealPlan.recipes.map(
      (r) => `${r.day.toLowerCase()}|${r.mealType.toLowerCase()}`
    )
  );
  const list = shoppingList(mealPlan);
  const listPages = Math.max(1, Math.ceil(list.length / LIST_PAGE_SIZE));
  // Removing meals shortens the list; the page you were on may be gone.
  if (listPage > listPages) setListPage(listPages);
  const listStart = (listPage - 1) * LIST_PAGE_SIZE;
  const pageItemsToBuy = list.slice(listStart, listStart + LIST_PAGE_SIZE);

  function goToListPage(next: number) {
    setListPage(next);
    const anchor = document.getElementById("shopping-list");
    if (!anchor) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(anchor, { offset: -120 });
    else anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const slotsFor = (day: string, meal: string) =>
    mealPlan.recipes.filter(
      (r) => r.day.toLowerCase() === day && r.mealType.toLowerCase() === meal
    );

  return (
    <div className="pb-20">
      {/* ---------- Masthead ---------- */}
      <section className="border-b-2 border-brown px-5 py-10 sm:px-[30px] sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/meal-plans"
            className="text-xs uppercase tracking-[0.2em] text-brown/55 transition-colors hover:text-red"
          >
            ← All meal plans
          </Link>

          <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className={`tag ${status.style}`}>{status.label}</span>
              <h1 className="mt-4 font-display text-[clamp(2.5rem,8vw,104px)] uppercase leading-[0.88] break-words text-brown">
                {mealPlan.name}
              </h1>
              <p className="mt-5 text-lg text-brown/80">
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
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={startEditing}
                  className="tag h-9 px-4 transition-colors hover:bg-brown hover:text-yellow"
                >
                  Edit plan
                </button>
                <button
                  onClick={() => {
                    setPlanError("");
                    setConfirmingDeletePlan(true);
                  }}
                  className="tag h-9 px-4 text-red transition-colors hover:border-red hover:bg-red hover:text-white"
                >
                  Delete plan
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-end gap-8">
              <div>
                <p className="font-display text-[clamp(3rem,7vw,80px)] leading-[0.8] text-red">
                  {filled.size}
                  <span className="text-brown/35">/{TOTAL_SLOTS}</span>
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brown/60">
                  slots filled
                </p>
              </div>
              {list.length > 0 && (
                <div>
                  <p className="font-display text-[clamp(3rem,7vw,80px)] leading-[0.8] text-brown">
                    {list.length}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brown/60">
                    to buy
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {editing && (
        <section className="border-b-2 border-brown px-5 py-8 sm:px-[30px]">
          <div className="mx-auto max-w-7xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmingSave(true);
              }}
              className="card p-6 sm:p-8"
            >
              <h2 className="font-display text-2xl uppercase leading-none text-brown sm:text-3xl">
                Edit this plan
              </h2>

              {editError && <div className="alert-error mt-5">{editError}</div>}

              <div className="mt-6 flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                  <label className="label" htmlFor="plan-edit-name">
                    Name
                  </label>
                  <input
                    id="plan-edit-name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="input h-12"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="plan-edit-start">
                    Start date
                  </label>
                  <input
                    id="plan-edit-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className="input h-12"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="plan-edit-end">
                    End date
                  </label>
                  <input
                    id="plan-edit-end"
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    className="input h-12"
                  />
                </div>

                <button type="submit" className="btn btn-primary h-12 px-7">
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary h-12"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ---------- The picker, parked under the navbar ---------- */}
      <section className="z-10 border-b-2 border-brown bg-yellow px-5 py-4 sm:px-[30px] md:sticky md:top-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="add-day">
                Day
              </label>
              <select
                id="add-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
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
              <label className="label" htmlFor="add-meal">
                Meal
              </label>
              <select
                id="add-meal"
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="input h-12"
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
                value={activeRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="input h-12"
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
              disabled={adding || !activeRecipeId}
              className="btn btn-primary h-12 px-7"
            >
              {adding ? "Adding..." : "Add to plan"}
            </button>
          </div>

          {error && <div className="alert-error mt-3">{error}</div>}
        </div>
      </section>

      {/* ---------- The week ---------- */}
      <section className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-7xl">
          {/* Desktop: a timetable, meals down, days across. */}
          <div className="hidden xl:grid xl:grid-cols-[auto_repeat(7,minmax(0,1fr))] xl:gap-2.5">
            <span />
            {DAYS.map((day) => (
              <p
                key={day}
                className="border-b-2 border-brown/25 pb-2.5 text-center font-display text-sm uppercase tracking-[0.1em] text-brown"
              >
                {day.slice(0, 3)}
              </p>
            ))}

            {MEAL_TYPES.map((meal) => (
              <Fragment key={meal}>
                <p className="flex items-center pr-4 font-display text-sm uppercase tracking-[0.1em] text-brown">
                  {meal}
                </p>
                {DAYS.map((day) => (
                  <Slot
                    key={`${day}-${meal}`}
                    items={slotsFor(day, meal)}
                    onPick={() => aimAt(day, meal)}
                    onRemove={(entry) => {
                      setRemoveError("");
                      setPendingRemove(entry);
                    }}
                    aimed={selectedDay === day && selectedMealType === meal}
                  />
                ))}
              </Fragment>
            ))}
          </div>

          {/* Mobile: a day at a time. */}
          <Reveal
            y={16}
            deps={[mealPlan.id]}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:hidden"
          >
            {DAYS.map((day) => (
              <div key={day} className="card p-5">
                <h2 className="font-display text-xl uppercase text-brown">
                  {day}
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {MEAL_TYPES.map((meal) => (
                    <div key={meal}>
                      <p className="mb-1.5 font-display text-xs uppercase tracking-[0.1em] text-brown">
                        {meal}
                      </p>
                      <Slot
                        items={slotsFor(day, meal)}
                        onPick={() => aimAt(day, meal)}
                        onRemove={(entry) => {
                          setRemoveError("");
                          setPendingRemove(entry);
                        }}
                        aimed={selectedDay === day && selectedMealType === meal}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- Shopping list ---------- */}
      {list.length > 0 && (
        <section
          id="shopping-list"
          className="border-t-2 border-brown px-5 py-12 sm:px-[30px]"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[clamp(2rem,6vw,80px)] uppercase leading-[0.9] text-brown">
                  Shopping list
                </h2>
                <p className="mt-4 max-w-[52ch] text-brown/70">
                  Every ingredient from the {mealPlan.recipes.length} meals on
                  this plan, folded together by name.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-brown/55">
                {bought.size} of {list.length} ticked
                {listPages > 1 &&
                  ` · ${listStart + 1}–${listStart + pageItemsToBuy.length}`}
              </p>
            </div>

            <ul className="mt-8 grid gap-px overflow-hidden rounded-card border-2 border-brown bg-brown/20 sm:grid-cols-2 lg:grid-cols-3">
              {pageItemsToBuy.map((item) => {
                const done = bought.has(item.name);
                return (
                  <li key={item.name} className="bg-beige">
                    <button
                      onClick={() => toggleBought(item.name)}
                      aria-pressed={done}
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white"
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-brown text-[0.6rem] ${
                          done ? "bg-brown text-yellow" : "bg-white"
                        }`}
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm leading-tight ${
                            done ? "text-brown/40 line-through" : "text-brown"
                          }`}
                        >
                          {item.name}
                        </span>
                        {item.amounts.length > 0 && (
                          <span className="mt-1 block text-[0.7rem] uppercase tracking-wide text-brown/50">
                            {item.amounts.join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={listPage}
              totalPages={listPages}
              onChange={goToListPage}
            />
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmingSave}
        busy={savingEdit}
        title="Save these changes?"
        confirmLabel="Save them"
        body={
          <p>
            This plan will be renamed to <strong>{form.name}</strong> and run
            from {form.startDate} to {form.endDate}. The meals on it stay where
            they are.
          </p>
        }
        onConfirm={saveEdit}
        onCancel={() => {
          if (!savingEdit) setConfirmingSave(false);
        }}
      />

      <ConfirmDialog
        open={confirmingDeletePlan}
        destructive
        busy={deletingPlan}
        title="Delete this plan?"
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        body={
          <>
            <p>
              <strong>{mealPlan.name}</strong> and the {mealPlan.recipes.length}{" "}
              meals scheduled on it will be removed. The recipes themselves stay
              in your catalog.
            </p>
            {planError && <p className="mt-3 text-red">{planError}</p>}
          </>
        }
        onConfirm={deletePlan}
        onCancel={() => {
          if (!deletingPlan) setConfirmingDeletePlan(false);
        }}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        destructive
        busy={removing}
        title="Take this meal off the plan?"
        confirmLabel="Remove it"
        cancelLabel="Leave it"
        body={
          <>
            <p>
              <strong>{pendingRemove?.recipe.title}</strong> will be cleared
              from {pendingRemove?.day} {pendingRemove?.mealType}. The recipe
              stays in your catalog.
            </p>
            {removeError && <p className="mt-3 text-red">{removeError}</p>}
          </>
        }
        onConfirm={removeEntry}
        onCancel={() => {
          if (removing) return;
          setPendingRemove(null);
          setRemoveError("");
        }}
      />
    </div>
  );
}

function Slot({
  items,
  onPick,
  onRemove,
  aimed,
}: {
  items: MealPlanRecipe[];
  onPick: () => void;
  onRemove: (entry: MealPlanRecipe) => void;
  aimed: boolean;
}) {
  if (items.length === 0) {
    return (
      <button
        onClick={onPick}
        aria-label="Aim the picker at this slot"
        className={`flex min-h-[72px] w-full items-center justify-center rounded-card border-2 border-dashed text-xl transition-colors ${
          aimed
            ? "border-red bg-red/15 text-red"
            : "border-brown/45 bg-white/55 text-brown/55 hover:border-brown hover:bg-white hover:text-red"
        }`}
      >
        +
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        // The remove button can't live inside the link, so it sits over it.
        <div key={item.id} className="group relative isolate">
          <Link
            href={`/recipes/${item.recipe.id}`}
            className="flex min-h-[72px] items-center gap-2.5 rounded-card border-2 border-brown bg-white p-2 transition-colors hover:bg-yellow"
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] border-2 border-brown">
              <Image
                src={item.recipe.imageUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>
            <span className="line-clamp-2 break-words pr-6 text-[0.8rem] font-medium leading-tight text-brown transition-colors group-hover:text-red">
              {item.recipe.title}
            </span>
          </Link>

          <button
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item.recipe.title} from this slot`}
            className="absolute right-1.5 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brown bg-beige text-xs leading-none text-brown/70 transition-colors hover:bg-red hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="pb-20" aria-hidden>
      <section className="border-b-2 border-brown px-5 py-10 sm:px-[30px] sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="h-4 w-32 animate-pulse rounded-pill bg-brown/10" />
          <div className="mt-6 h-8 w-28 animate-pulse rounded-pill bg-brown/10" />
          <div className="mt-4 h-20 w-96 max-w-full animate-pulse rounded-card bg-brown/10" />
        </div>
      </section>
      <section className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-card bg-brown/10"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
