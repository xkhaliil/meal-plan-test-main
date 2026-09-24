"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Reveal from "@/app/components/motion/Reveal";
import { useMealPlanStore, type MealPlan } from "@/lib/stores/mealPlanStore";
import { Fragment, useState, useEffect } from "react";

// Same vocabulary the plan detail page writes.
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const TOTAL_SLOTS = DAYS.length * MEAL_TYPES.length;

type Status = "active" | "upcoming" | "past";

const STATUS_LABEL: Record<Status, string> = {
  active: "This week",
  upcoming: "Upcoming",
  past: "Finished",
};

const STATUS_STYLE: Record<Status, string> = {
  active: "bg-green text-white",
  upcoming: "bg-sky text-brown",
  past: "bg-transparent text-brown/60",
};

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(start).toLocaleDateString(
    undefined,
    opts
  )} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

/** Compared by day, not by instant, so a plan ending today still counts. */
function planStatus(plan: MealPlan): Status {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(plan.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(plan.endDate);
  end.setHours(23, 59, 59, 999);

  if (end.getTime() < today.getTime()) return "past";
  if (start.getTime() > today.getTime()) return "upcoming";
  return "active";
}

function filledSlots(plan: MealPlan): Set<string> {
  return new Set(
    plan.recipes.map(
      (r) => `${r.day.toLowerCase()}|${r.mealType.toLowerCase()}`
    )
  );
}

/** yyyy-mm-dd in local time, which is what a date input expects. */
function isoDay(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Monday–Sunday, `weeksAhead` weeks from the one we're in. */
function weekRange(weeksAhead: number) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7) + weeksAhead * 7
  );

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { monday, sunday };
}

export default function MealPlansPage() {
  const mealPlans = useMealPlanStore((s) => s.plans);
  const loading = useMealPlanStore((s) => s.loading);
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MealPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    useMealPlanStore.getState().fetchPlans();
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
    const result = await useMealPlanStore
      .getState()
      .createPlan({ name, startDate, endDate });
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Could not create meal plan");
      return;
    }

    setName("");
    setStartDate("");
    setEndDate("");
    setShowCreateForm(false);
    setStatusFilter(null);
  }

  async function confirmDeletePlan() {
    if (!pendingDelete) return;
    setDeleteError("");
    setDeleting(true);

    const result = await useMealPlanStore
      .getState()
      .deletePlan(pendingDelete.id);
    setDeleting(false);

    if (!result.ok) {
      setDeleteError(result.error ?? "Could not delete it.");
      return;
    }
    setPendingDelete(null);
  }

  /** Fills the form with a Monday–Sunday week, naming it if it's untitled. */
  function fillWeek(weeksAhead: number) {
    const { monday, sunday } = weekRange(weeksAhead);
    setStartDate(isoDay(monday));
    setEndDate(isoDay(sunday));
    setName(
      (current) =>
        current.trim() ||
        `Week of ${monday.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`
    );
  }

  // Newest week first — the one you're cooking from is what you came for.
  const sorted = [...mealPlans].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  const visiblePlans = statusFilter
    ? sorted.filter((plan) => planStatus(plan) === statusFilter)
    : sorted;

  const counts = mealPlans.reduce<Record<Status, number>>(
    (acc, plan) => {
      acc[planStatus(plan)]++;
      return acc;
    },
    { active: 0, upcoming: 0, past: 0 }
  );

  const scheduledMeals = mealPlans.reduce(
    (total, plan) => total + plan.recipes.length,
    0
  );

  return (
    <div className="pb-20">
      {/* ---------- Masthead ---------- */}
      <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px] sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brown/60">
              Your weeks
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,9vw,128px)] uppercase leading-[0.88] text-brown">
              Meal plans
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-brown/80">
              Twenty-one slots a week, filled from recipes you already trust.
              Decide once, then stop deciding.
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-8">
            <div>
              <p className="font-display text-[clamp(3.5rem,8vw,96px)] leading-[0.8] text-red">
                {mealPlans.length}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brown/60">
                {mealPlans.length === 1 ? "plan" : "plans"}
                {scheduledMeals > 0 && ` · ${scheduledMeals} meals`}
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className={`btn h-14 px-8 text-base sm:h-[68px] sm:px-10 sm:text-lg ${
                showCreateForm ? "btn-secondary" : "btn-primary"
              }`}
            >
              {showCreateForm ? "Cancel" : "New meal plan"}
            </button>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <section className="border-b-2 border-brown px-5 py-10 sm:px-[30px]">
          <div className="mx-auto max-w-7xl">
            <form onSubmit={handleCreate} className="card p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-brown pb-5">
                <div>
                  <h2 className="font-display text-3xl uppercase leading-none text-brown sm:text-[44px]">
                    New meal plan
                  </h2>
                  <p className="mt-2 text-sm text-brown/70">
                    Name the week and set its dates — the slots get filled from
                    the plan itself.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fillWeek(0)}
                    className="tag h-9 px-4 py-0 text-[0.7rem] transition-colors hover:bg-brown hover:text-yellow"
                  >
                    This week
                  </button>
                  <button
                    type="button"
                    onClick={() => fillWeek(1)}
                    className="tag h-9 px-4 py-0 text-[0.7rem] transition-colors hover:bg-brown hover:text-yellow"
                  >
                    Next week
                  </button>
                </div>
              </div>

              {error && <div className="alert-error mt-5">{error}</div>}

              <div className="mt-6 flex flex-wrap items-end gap-4">
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
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "Creating..." : "Create plan"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ---------- Status band ---------- */}
      {mealPlans.length > 0 && (
        <section className="z-10 border-b-2 border-brown bg-yellow px-5 py-4 sm:px-[30px] md:sticky md:top-20">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
              <StatusChip
                active={statusFilter === null}
                onClick={() => setStatusFilter(null)}
              >
                All {mealPlans.length}
              </StatusChip>
              {(["active", "upcoming", "past"] as Status[])
                .filter((status) => counts[status] > 0)
                .map((status) => (
                  <StatusChip
                    key={status}
                    active={statusFilter === status}
                    onClick={() =>
                      setStatusFilter((s) => (s === status ? null : status))
                    }
                  >
                    {STATUS_LABEL[status]} {counts[status]}
                  </StatusChip>
                ))}
            </div>

            <p className="shrink-0 text-xs uppercase tracking-[0.2em] text-brown/60">
              {statusFilter
                ? `${visiblePlans.length} of ${mealPlans.length}`
                : `${mealPlans.length} total`}
            </p>
          </div>
        </section>
      )}

      {/* ---------- The plans ---------- */}
      <section className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <PlanCardSkeleton key={i} />
              ))}
            </div>
          ) : visiblePlans.length === 0 ? (
            <EmptyState
              filtered={statusFilter !== null}
              onReset={() => setStatusFilter(null)}
              onCreate={() => setShowCreateForm(true)}
            />
          ) : (
            <Reveal
              y={18}
              deps={[mealPlans.length > 0, statusFilter]}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            >
              {visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onRequestDelete={() => {
                    setDeleteError("");
                    setPendingDelete(plan);
                  }}
                />
              ))}
            </Reveal>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        busy={deleting}
        title="Delete this meal plan?"
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        body={
          <>
            <p>
              <strong>{pendingDelete?.name}</strong> and the{" "}
              {pendingDelete?.recipes.length ?? 0} meals scheduled on it will be
              removed. The recipes themselves stay in your catalog.
            </p>
            {deleteError && <p className="mt-3 text-red">{deleteError}</p>}
          </>
        }
        onConfirm={confirmDeletePlan}
        onCancel={() => {
          if (deleting) return;
          setPendingDelete(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}

function StatusChip({
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
      className={`tag h-9 shrink-0 gap-1.5 px-4 py-0 text-[0.7rem] transition-colors ${
        active ? "bg-brown text-yellow" : "hover:bg-brown hover:text-yellow"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filtered,
  onReset,
  onCreate,
}: {
  filtered: boolean;
  onReset: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-20 text-center">
      <p className="font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] text-brown">
        {filtered ? "None of those" : "No weeks planned"}
      </p>
      <p className="mt-5 max-w-[44ch] text-brown/70">
        {filtered
          ? "Nothing in that state right now."
          : "Start a week, then drop recipes into its breakfast, lunch and dinner slots."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {filtered ? (
          <button onClick={onReset} className="btn btn-primary">
            Show all plans
          </button>
        ) : (
          <>
            <button onClick={onCreate} className="btn btn-primary">
              New meal plan
            </button>
            <Link href="/recipes" className="btn btn-secondary">
              Browse recipes
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="card p-6" aria-hidden>
      <div className="h-5 w-24 animate-pulse rounded-pill bg-brown/10" />
      <div className="mt-4 h-8 w-2/3 animate-pulse rounded-pill bg-brown/10" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded-pill bg-brown/10" />
      <div className="mt-7 h-[72px] w-full animate-pulse rounded-card bg-brown/10" />
      <div className="mt-7 h-9 w-full animate-pulse rounded-pill bg-brown/10" />
    </div>
  );
}

function PlanCard({
  plan,
  onRequestDelete,
}: {
  plan: MealPlan;
  onRequestDelete: () => void;
}) {
  const status = planStatus(plan);
  const filled = filledSlots(plan);
  const thumbnails = plan.recipes.slice(0, 4);

  return (
    <article className="card group relative isolate flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white">
      {/* One target for the card; the delete button sits above it. */}
      <Link
        href={`/meal-plans/${plan.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${plan.name}`}
      />
      <div className="flex items-start justify-between gap-4">
        <span className={`tag shrink-0 ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-[0.7rem] uppercase tracking-[0.12em] text-brown/55">
          {filled.size} / {TOTAL_SLOTS} slots
        </span>
      </div>

      <h2 className="mt-4 font-display text-2xl uppercase leading-[1.05] break-words text-brown transition-colors group-hover:text-red">
        {plan.name}
      </h2>
      <p className="mt-2 text-sm text-brown/70">
        {formatRange(plan.startDate, plan.endDate)}
      </p>

      {/* The week at a glance: a cell per meal slot, filled or not. */}
      <div className="mt-6 grid grid-cols-[auto_repeat(7,minmax(0,1fr))] items-center gap-1.5">
        <span />
        {DAY_INITIALS.map((initial, i) => (
          <span
            key={`${initial}-${i}`}
            aria-hidden
            className="text-center text-[0.6rem] uppercase tracking-wide text-brown/45"
          >
            {initial}
          </span>
        ))}

        {MEAL_TYPES.map((meal) => (
          <Fragment key={meal}>
            <span
              aria-hidden
              className="pr-1.5 text-[0.6rem] uppercase tracking-wide text-brown/45"
            >
              {meal.charAt(0)}
            </span>
            {DAYS.map((day) => (
              <span
                key={day}
                className={`h-5 rounded-[7px] border-2 ${
                  filled.has(`${day}|${meal}`)
                    ? "border-brown bg-brown"
                    : "border-brown/20"
                }`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <p className="sr-only">
        {filled.size} of {TOTAL_SLOTS} meal slots filled.
      </p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t-2 border-brown pt-5">
        {thumbnails.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3">
              {thumbnails.map((item) => (
                <span
                  key={item.id}
                  className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-brown bg-beige"
                >
                  <Image
                    src={item.recipe.imageUrl}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </span>
              ))}
            </div>
            {plan.recipes.length > thumbnails.length && (
              <span className="text-xs uppercase tracking-wide text-brown/55">
                +{plan.recipes.length - thumbnails.length}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs uppercase tracking-[0.12em] text-brown/45">
            Nothing scheduled
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onRequestDelete}
            className="relative z-20 rounded-pill border-2 border-transparent px-3 py-1 text-xs uppercase tracking-wide text-brown/55 transition-colors hover:border-red hover:text-red"
          >
            Delete
          </button>
          <span className="btn-circle h-11 w-11 text-base transition-colors group-hover:bg-brown group-hover:text-yellow">
            →
          </span>
        </div>
      </div>
    </article>
  );
}
