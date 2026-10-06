import Link from "next/link";
import AuthCta from "@/app/components/AuthCta";
import ProPrice from "@/app/components/ProPrice";
import Wordmark from "@/app/components/Wordmark";
import {
  ChefPeek,
  ListPeek,
  RecipesPeek,
} from "@/app/components/landing/FeaturePeeks";
import FruitIntro from "@/app/components/landing/FruitIntro";
import LandingNav from "@/app/components/landing/LandingNav";
import PlateHero from "@/app/components/landing/PlateHero";
import WeekMockup from "@/app/components/landing/WeekMockup";

/**
 * The marketing page. It opens with agrumeafarm.it's intro and hero (see
 * FruitIntro and PlateHero), whose dome carries on below the hero to hold a
 * centred serif statement in white. After that it is kept short: the planner
 * in a browser frame, three cards that show the rest of the app (recipes,
 * the shopping list, Chef Ferraro), and the two plans over the hero's wash.
 *
 * Every number on the page is a fact about the product (the seeded catalog,
 * the planner's grid, the free plan's enforced limit) — none of them is a user
 * count or a rating, because the app has neither to report.
 */

const PROOF = [
  { figure: "20", label: "starter recipes" },
  { figure: "21", label: "meal slots a week" },
  { figure: "", label: "AI chef" },
];

const FEATURES = [
  {
    title: "Your recipes",
    text: "Everything you cook in one place, searchable by name or cuisine and scaled to whoever is at the table.",
    Peek: RecipesPeek,
  },
  {
    title: "One shopping list",
    text: "Every ingredient from the week's meals, folded together by name. Tick it off as you shop.",
    Peek: ListPeek,
  },
  {
    title: "Chef Ferraro",
    tag: "AI",
    text: "Describe a craving or what's left in the fridge, and get a whole recipe written straight into your catalog.",
    Peek: ChefPeek,
  },
];

// Kept in step with what the app actually enforces: the free plan is capped at
// five Recipe Bot messages a day, and only Pro gets a generated photo for the
// recipes the bot writes. Nothing else is limited today.
const FREE_PLAN = [
  "5 Recipe Bot messages a day",
  "The full recipe catalog",
  "Weekly meal plans and shopping lists",
];

const PRO_PLAN = [
  "Everything in Free",
  "Unlimited Recipe Bot messages",
  "A generated photo for each recipe the bot writes",
];

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path
        d="M3 8h10m0 0L9 4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        inverted
          ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white"
          : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white"
      }
    >
      ✓
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <FruitIntro />
      <LandingNav />

      <main id="main">
        {/* The stats and the opening statement sit on the rest of the dome's
            shape, which PlateHero draws below the hero, so they are white. */}
        <PlateHero>
          {/* One to a line on a phone, where three won't share one. */}
          <p className="flex flex-col items-center gap-y-2.5 text-[13px] text-white sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
            {PROOF.map((p, i) => (
              <span key={p.label} className="flex items-center gap-x-5">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="hidden h-1 w-1 rounded-full bg-white/40 sm:block"
                  />
                )}
                <span className="flex items-baseline gap-1.5">
                  {p.figure && (
                    <span className="font-medium tabular-nums">{p.figure}</span>
                  )}
                  <span className="uppercase tracking-[0.15em]">{p.label}</span>
                </span>
              </span>
            ))}
          </p>

          <div className="mt-14 text-center sm:mt-20">
            <h2 className="text-[44px] leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[68px]">
              Your meals.
              <br />
              Planned. Cooked. Enjoyed.
            </h2>

            <p className="mx-auto mt-7 max-w-[34rem] text-lg leading-relaxed text-zinc-300 sm:text-xl">
              Keep every recipe in one place, plan the week in minutes, and let
              the Recipe Bot fill the gaps.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <AuthCta
                className="inline-flex h-[52px] items-center gap-2.5 rounded-full bg-white px-8 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                signedOut={{ href: "/register", label: "Start planning free" }}
                signedIn={{ href: "/meal-plans", label: "Plan this week" }}
                trailing={<Arrow />}
              />
              <a
                href="#features"
                className="text-[15px] text-zinc-300 transition-colors hover:text-white"
              >
                See how it works
              </a>
            </div>

            <p className="mt-6 text-[13px] text-zinc-300">
              Free for the everyday basics. No card required.
            </p>
          </div>
        </PlateHero>

        {/* ---------- The planner, in a browser frame ---------- */}
        <section className="relative bg-white px-5 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
            <p className="eyebrow">The planner</p>
            <h2 className="mt-4 text-balance text-4xl tracking-tight sm:text-5xl">
              Your whole week at a glance
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
              Breakfast, lunch and dinner for all seven days.{" "}
              <span className="md:hidden">Tap</span>
              <span className="hidden md:inline">Click</span> an empty slot and
              pick a recipe from your catalog.
            </p>
          </div>
          <WeekMockup />
        </section>

        {/* ---------- The rest of the app, around the planner ---------- */}
        <section id="features" className="scroll-mt-24 px-5 pb-20 sm:pb-28">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-4xl tracking-tight sm:text-5xl">
                Decide what&apos;s for dinner once a week
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
                Plan from the recipes you trust, shop from one list, and ask
                Chef Ferraro when the ideas run out.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-md gap-5 lg:max-w-none lg:grid-cols-3">
              {FEATURES.map(({ title, tag, text, Peek }) => (
                <article
                  key={title}
                  className="overflow-hidden rounded-3xl border border-zinc-200 bg-white"
                >
                  <Peek />
                  <div className="p-6">
                    <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-zinc-900">
                      {title}
                      {tag && <span className="tag">{tag}</span>}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">
                      {text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Pricing, over the hero's wash ---------- */}
        <section
          id="pricing"
          className="hero-wash scroll-mt-24 px-5 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="eyebrow">Plans</p>
              <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">
                Simple pricing
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg">
                Everything that makes a week work is free. Pro is for the cooks
                who lean on Chef Ferraro.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-md gap-4 sm:mt-14 sm:gap-5 md:max-w-none md:grid-cols-2">
              {/* Free */}
              <article className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
                <h3 className="text-4xl">Free</h3>
                <p className="mt-3 text-zinc-500">
                  Plan a normal week, start to finish.
                </p>
                <ul className="mt-8 space-y-3.5 text-[15px] text-zinc-700">
                  {FREE_PLAN.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check inverted />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <AuthCta
                    className="btn btn-secondary h-12 w-full"
                    signedOut={{ href: "/register", label: "Start free" }}
                    signedIn={{ href: "/recipes", label: "Open the app" }}
                  />
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    No card needed
                  </p>
                </div>
              </article>

              {/* Pro. Bordered like Free, so their buttons line up. */}
              <article className="flex flex-col rounded-3xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-[0_40px_80px_-32px_rgba(24,24,27,0.45)] sm:p-8">
                <h3 className="text-4xl text-white">Pro</h3>
                <p className="mt-3 text-zinc-400">
                  For the weeks you cook properly.
                </p>
                <ul className="mt-8 space-y-3.5 text-[15px] text-zinc-200">
                  {PRO_PLAN.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <AuthCta
                    className="flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                    signedOut={{ href: "/register", label: "Get Pro" }}
                    signedIn={{ href: "/settings", label: "Upgrade to Pro" }}
                  />
                  <ProPrice className="mt-3 block text-center text-xs text-zinc-400" />
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-zinc-100 px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
          <Wordmark href="/landing" />
          <nav aria-label="Footer" className="flex gap-8 text-sm text-zinc-400">
            <Link
              href="/recipes"
              className="transition-colors hover:text-zinc-900"
            >
              Recipes
            </Link>
            <AuthCta
              className="transition-colors hover:text-zinc-900"
              signedOut={{ href: "/login", label: "Sign in" }}
              signedIn={{ href: "/settings", label: "Account" }}
            />
          </nav>
          <p className="text-sm text-zinc-300">
            © {new Date().getFullYear()} MealPlan
          </p>
        </div>
      </footer>
    </div>
  );
}
