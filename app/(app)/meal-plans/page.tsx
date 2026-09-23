"use client";

import Link from "next/link";
import Reveal from "@/app/components/motion/Reveal";
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

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(
    end
  ).toLocaleDateString(undefined, opts)}`;
}

export default function MealPlansPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function loadMealPlans() {
    const token = localStorage.getItem("token");
    fetch("/api/meal-plans", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMealPlans(data.mealPlans || []));
  }

  useEffect(() => {
    loadMealPlans();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !startDate || !endDate) {
      setError("Name, start date, and end date are required");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, startDate, endDate }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create meal plan");
      return;
    }

    setName("");
    setStartDate("");
    setEndDate("");
    setShowCreateForm(false);
    loadMealPlans();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl uppercase text-brown">Meal plans</h1>
          <p className="mt-1 text-sm text-brown/70">
            Build a week from recipes you already have.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className={showCreateForm ? "btn btn-secondary" : "btn btn-primary"}
        >
          {showCreateForm ? "Cancel" : "New meal plan"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="card mt-6 p-6">
          <h2 className="text-lg uppercase text-brown">New meal plan</h2>
          {error && <div className="alert-error mt-4">{error}</div>}
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="label" htmlFor="plan-name">
                Name
              </label>
              <input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Week of the 12th"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="plan-start">
                Start date
              </label>
              <input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="plan-end">
                End date
              </label>
              <input
                id="plan-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Creating..." : "Create plan"}
            </button>
          </div>
        </form>
      )}

      {mealPlans.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <p className="text-sm text-brown/70">
            No meal plans yet. Create one to start scheduling meals.
          </p>
        </div>
      ) : (
        <Reveal
          y={18}
          deps={[mealPlans.length > 0]}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {mealPlans.map((plan) => (
            <Link
              key={plan.id}
              href={`/meal-plans/${plan.id}`}
              className="card group p-6 transition-shadow hover:shadow-[0_2px_16px_rgba(28,25,23,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl uppercase text-brown group-hover:text-red">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-sm text-brown/70">
                    {formatRange(plan.startDate, plan.endDate)}
                  </p>
                </div>
                <span className="tag shrink-0">
                  {plan.recipes.length} {plan.recipes.length === 1 ? "meal" : "meals"}
                </span>
              </div>

              {plan.recipes.length > 0 && (
                <p className="mt-4 line-clamp-1 text-xs text-brown/55">
                  {plan.recipes
                    .slice(0, 4)
                    .map((r) => r.recipe.title)
                    .join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </Reveal>
      )}
    </div>
  );
}
