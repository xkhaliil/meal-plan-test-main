import Image from "next/image";
import ChefLogo from "@/app/components/ChefLogo";
import { cn } from "@/lib/utils";

const SLOTS = ["Breakfast", "Lunch", "Dinner"];

const WEEK = [
  {
    day: "Mon",
    date: 13,
    meals: ["Classic Pancakes", "Caesar Salad", "Grilled Salmon"],
  },
  {
    day: "Tue",
    date: 14,
    meals: ["French Toast", "Greek Salad", "Chicken Tikka"],
  },
  {
    day: "Wed",
    date: 15,
    meals: ["Berry Parfait", "Fish Tacos", "Veggie Stir Fry"],
  },
  { day: "Thu", date: 16, meals: ["Avocado Toast", "", "Miso Ramen"] },
  { day: "Fri", date: 17, meals: ["", "Caprese Sandwich", "Pasta Carbonara"] },
  { day: "Sat", date: 18, meals: ["Banana Smoothie", "", "Beef Stew"] },
  { day: "Sun", date: 19, meals: ["", "Tom Yum Soup", "Lamb Curry"] },
];

/** The day the mock pretends is today, so one column carries the accent. */
const TODAY = "Wed";

/**
 * The day the phone view opens on: tomorrow, which still has a slot to fill.
 * Its dishes are seeded recipes with a plate photo; times and cuisines are
 * the seed's.
 */
const PHONE_DAY = { day: "Thu", name: "Thursday 16" };
const DISHES: Record<string, { slug: string; meta: string }> = {
  "Avocado Toast": { slug: "avocado-toast", meta: "15 min · American" },
  "Miso Ramen": { slug: "miso-ramen", meta: "65 min · Japanese" },
};

/**
 * The product, shown as the device would show it: inside a browser frame on
 * a wide screen, the device faceiqlabs.com uses under its hero; and on a
 * phone as the phone would, one day at a time under a strip of the week,
 * since seven columns can't be read at that width. Built in HTML rather than
 * as screenshots: sharp at every width, weightless, and never out of date.
 *
 * Purely illustrative, so it is hidden from assistive tech; the copy around it
 * says what the planner does.
 */
export default function WeekMockup() {
  return (
    <>
      <PhoneWeek />
      <BrowserWeek />
    </>
  );
}

function PhoneWeek() {
  const day = WEEK.find((d) => d.day === PHONE_DAY.day)!;

  return (
    <div
      aria-hidden
      className="relative mx-auto max-w-sm select-none md:hidden"
    >
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_40px_80px_-32px_rgba(24,24,27,0.28)]">
        {/* The app's own header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <ChefLogo size={22} />
            <span className="text-[13px] font-semibold text-zinc-900">
              This week
            </span>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
            A
          </span>
        </div>

        {/* The week, a day to a column; a dot for each meal planned */}
        <div className="grid grid-cols-7 gap-1 border-b border-zinc-100 px-3 py-3">
          {WEEK.map((col) => {
            const selected = col.day === PHONE_DAY.day;
            return (
              <div
                key={col.day}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl py-2",
                  selected ? "bg-zinc-900 text-white" : "text-zinc-400"
                )}
              >
                <span className="text-[9px] font-medium uppercase tracking-[0.12em]">
                  {col.day}
                </span>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    selected ? "font-semibold" : "font-medium text-zinc-700"
                  )}
                >
                  {col.date}
                </span>
                <span className="flex gap-0.5">
                  {col.meals.map((meal, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        meal
                          ? selected
                            ? "bg-white"
                            : "bg-zinc-400"
                          : selected
                            ? "bg-white/30"
                            : "bg-zinc-200"
                      )}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        {/* The day */}
        <div className="space-y-2.5 p-4">
          <p className="px-1 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400">
            {PHONE_DAY.name}
          </p>
          {SLOTS.map((slot, i) => {
            const meal = day.meals[i];
            const dish = DISHES[meal];
            return dish ? (
              <div
                key={slot}
                className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-2 pr-4"
              >
                <Image
                  src={`/images/plates/${dish.slug}.jpg`}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                    {slot}
                  </p>
                  <p className="truncate text-[13px] font-medium text-zinc-900">
                    {meal}
                  </p>
                  <p className="text-[11px] text-zinc-400">{dish.meta}</p>
                </div>
              </div>
            ) : (
              <div
                key={slot}
                className="flex h-[66px] items-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-3 text-zinc-400"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-base leading-none">
                  +
                </span>
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em]">
                    {slot}
                  </p>
                  <p className="text-[13px]">Add a recipe</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BrowserWeek() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden max-w-5xl select-none md:block"
    >
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_40px_80px_-32px_rgba(24,24,27,0.28)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
          </div>
          <div className="mx-auto rounded-md border border-zinc-200 bg-white px-10 py-1 text-[11px] text-zinc-400 sm:px-16">
            mealplan.app
          </div>
          <div className="w-[42px]" />
        </div>

        {/* The app's own header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-5">
            <ChefLogo size={22} />
            <div className="hidden gap-1 text-[11px] sm:flex">
              <span className="rounded-full px-2.5 py-1 text-zinc-400">
                Recipes
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-900">
                This week
              </span>
              <span className="rounded-full px-2.5 py-1 text-zinc-400">
                Chef Ferraro
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="hidden sm:inline">Shopping list</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
              A
            </span>
          </div>
        </div>

        {/* The week */}
        <div className="no-scrollbar overflow-x-auto">
          <div className="grid min-w-[688px] grid-cols-7 gap-2 p-4 lg:min-w-[760px] lg:gap-3 lg:p-5">
            {WEEK.map((col) => {
              const today = col.day === TODAY;
              return (
                <div key={col.day} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between px-1">
                    <span
                      className={
                        today
                          ? "text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-900"
                          : "text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400"
                      }
                    >
                      {col.day}
                    </span>
                    <span
                      className={
                        today
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white"
                          : "text-[11px] text-zinc-300"
                      }
                    >
                      {col.date}
                    </span>
                  </div>

                  {/* Below lg a column is too narrow for most names on one
                      line, so they take two and every slot is the height of
                      two, which keeps the rows level across the week. */}
                  {SLOTS.map((slot, i) => {
                    const meal = col.meals[i];
                    return meal ? (
                      <div
                        key={slot}
                        className={cn(
                          "min-h-[62px] rounded-xl px-2.5 py-2 lg:min-h-0",
                          today
                            ? "border border-zinc-200 bg-white shadow-[0_4px_12px_-6px_rgba(24,24,27,0.15)]"
                            : "border border-zinc-100 bg-zinc-50/70"
                        )}
                      >
                        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                          {slot}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-zinc-800 lg:line-clamp-none lg:truncate">
                          {meal}
                        </p>
                      </div>
                    ) : (
                      <div
                        key={slot}
                        className="flex h-[62px] items-center justify-center rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-300 lg:h-[46px]"
                      >
                        +
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fades the frame into the page, the way the hero mockup on
          faceiqlabs.com is cut off by the section below it. */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-24 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
