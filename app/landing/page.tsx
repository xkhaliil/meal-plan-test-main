import ChefLogo from "@/app/components/ChefLogo";
import Image from "next/image";
import Link from "next/link";

const HERO_DISHES = [
  { src: "/images/recipes/grilled-salmon.jpg", alt: "Grilled salmon fillet with lemon" },
  { src: "/images/recipes/miso-ramen.jpg", alt: "Bowl of miso ramen" },
  { src: "/images/recipes/pasta-carbonara.jpg", alt: "Spaghetti carbonara" },
  { src: "/images/recipes/chicken-tikka.jpg", alt: "Chicken tikka masala with rice" },
];

const STEPS = [
  {
    number: "01",
    title: "Build your catalog",
    body: "Save the meals you actually cook. Ingredients, timings, and tags stay in one place instead of scattered across screenshots and bookmarks.",
  },
  {
    number: "02",
    title: "Ask the Recipe Bot",
    body: "Out of ideas? Describe a craving or a dietary constraint and it writes a complete recipe — photo included — straight into your catalog.",
  },
  {
    number: "03",
    title: "Plan the week",
    body: "Drop recipes into breakfast, lunch, and dinner across a seven-day grid. Decide once, then just cook.",
  },
];

const FEATURES = [
  {
    title: "Everything in one catalog",
    body: "Ingredients, prep and cook times, servings, cuisine, and dietary tags — structured, searchable, yours.",
  },
  {
    title: "A week at a glance",
    body: "Twenty-one slots, filled from recipes you already trust. No more 6pm improvising.",
  },
  {
    title: "AI that writes real recipes",
    body: "The Recipe Bot returns structured recipes, not walls of chat text — so every idea is saved properly and ready to schedule.",
  },
  {
    title: "Cook for the right number",
    body: "Servings and calories travel with each recipe, so a plan for two never turns into a plan for six.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <ChefLogo size={28} href={null} priority />
            <span className="whitespace-nowrap font-display text-lg font-semibold text-ink">
              MealPlan Pro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-terracotta">
                Meal planning, minus the guesswork
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-[1.08] text-ink sm:text-6xl">
                Decide what&apos;s for dinner{" "}
                <span className="text-terracotta">once a week.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                MealPlan Pro keeps every recipe you cook in one catalog, turns cravings
                into new ones with AI, and lays the whole week out in a single grid —
                so weeknights stop being a decision.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className="btn btn-primary px-6 py-3 text-base">
                  Start planning free
                </Link>
                <Link href="/login" className="btn btn-secondary px-6 py-3 text-base">
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-sm text-subtle">
                Free plan, no card required. Upgrade when you want unlimited AI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {HERO_DISHES.map((dish, i) => (
                <div
                  key={dish.src}
                  className={`relative h-52 overflow-hidden rounded-xl border border-line sm:h-60 ${
                    i % 2 === 1 ? "mt-8" : ""
                  }`}
                >
                  <Image
                    src={dish.src}
                    alt={dish.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                    priority={i < 2}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="max-w-xl text-3xl font-semibold text-ink">
              Three steps between you and a planned week
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number}>
                  <span className="font-display text-sm font-semibold text-terracotta">
                    {step.number}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-xl text-3xl font-semibold text-ink">
            Built around how people actually cook
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-surface p-8">
                <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-ink">Simple pricing</h2>
              <p className="mt-2 text-sm text-muted">
                Start free. Upgrade only if you want the AI to do the heavy lifting.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="card p-8">
                <h3 className="text-lg font-semibold text-ink">Free</h3>
                <p className="mt-1 text-sm text-muted">
                  Everything you need to plan by hand.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-ink">
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    Unlimited recipes and meal plans
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    Full weekly planner
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    5 Recipe Bot messages per day
                  </li>
                </ul>
                <Link href="/register" className="btn btn-secondary mt-8 w-full">
                  Get started
                </Link>
              </div>

              <div className="card border-terracotta/40 bg-terracotta-soft p-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">Pro</h3>
                  <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-medium text-white">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  For anyone leaning on the Recipe Bot weekly.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-ink">
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    Everything in Free
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    Unlimited Recipe Bot messages
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sage" aria-hidden>
                      ✓
                    </span>
                    AI-generated photography for new recipes
                  </li>
                </ul>
                <Link href="/register" className="btn btn-primary mt-8 w-full">
                  Start with Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold leading-tight text-ink">
            Your next seven dinners, already decided.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted">
            Join and plan your first week in a few minutes.
          </p>
          <Link href="/register" className="btn btn-primary mt-8 px-7 py-3 text-base">
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-2">
            <ChefLogo size={22} href={null} />
            <span className="text-sm text-muted">
              © {new Date().getFullYear()} MealPlan Pro
            </span>
          </div>
          <div className="flex gap-6 text-sm text-muted">
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
