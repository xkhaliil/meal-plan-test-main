import AuthCta from "@/app/components/AuthCta";
import CookIllustration from "@/app/components/CookIllustration";
import LandingHeaderActions from "@/app/components/LandingHeaderActions";
import Marquee from "@/app/components/Marquee";
import RotatingBadge from "@/app/components/RotatingBadge";
import WavyWordmark from "@/app/components/WavyWordmark";
import Image from "next/image";
import Link from "next/link";

/**
 * Landing page laid out section-for-section against cafebinocle.com, using the
 * dimensions measured off the live site at a 1440px viewport:
 *
 *   hero            1440x739   (logotype 438x90, wordmark 973x524, seal 417)
 *   sec_le_cafe     1440x285   (480 illustration | 950 heading)
 *   marquee         1440x97
 *   sec_nos_cafe    heading 1380x256, boxes 1380x280, banner 1380x768
 *   sec_dans_un     statement 52px/52px, button 265x86, side image 320x591
 *   sec_collab      1440x448   (heading 835 | image 485)
 *   sec_greenwash   1440x299   (two 630 halves)
 *   footer          1440x582
 */

const CATALOG = [
  {
    title: "Miso Ramen",
    img: "/images/recipes/miso-ramen.jpg",
    time: "65 min",
    tag: "Japanese",
  },
  {
    title: "Grilled Salmon",
    img: "/images/recipes/grilled-salmon.jpg",
    time: "35 min",
    tag: "High-protein",
  },
  {
    title: "Chicken Tikka",
    img: "/images/recipes/chicken-tikka.jpg",
    time: "65 min",
    tag: "Indian",
  },
  {
    title: "Veggie Stir Fry",
    img: "/images/recipes/veggie-stir-fry.jpg",
    time: "25 min",
    tag: "Vegan",
  },
];

const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner"];

const WEEK = [
  { day: "Mon", meals: ["Classic Pancakes", "Caesar Salad", "Grilled Salmon"] },
  { day: "Tue", meals: ["French Toast", "Greek Salad", "Chicken Tikka"] },
  { day: "Wed", meals: ["Berry Parfait", "Fish Tacos", "Veggie Stir Fry"] },
  { day: "Thu", meals: ["Avocado Toast", "", "Miso Ramen"] },
  { day: "Fri", meals: ["", "Caprese Sandwich", "Pasta Carbonara"] },
  { day: "Sat", meals: ["Banana Smoothie", "", "Beef Stew"] },
  { day: "Sun", meals: ["", "Tom Yum Soup", "Lamb Curry"] },
];

const TICKER = [
  "Meal planner of the year",
  "Plan the week in minutes",
  "Your recipes, one catalog",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-yellow">
      {/* ---------- Header ---------- */}
      <header className="px-5 sm:px-[30px]">
        <nav className="flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-[48px]">
          <p className="w-[438px] max-w-full text-2xl font-bold uppercase leading-[1.05] tracking-tight text-brown sm:text-[40px] sm:leading-[45px]">
            MealPlan<sup className="text-base"></sup>
          </p>

          <LandingHeaderActions />
        </nav>
      </header>

      <main>
        {/* ---------- Hero: wordmark + seal + note ---------- */}
        <section className="relative px-5 pt-4 sm:px-[30px] mt-14">
          <h1 className="sr-only">MealPlan Pro</h1>

          {/* Wordmark row is 524px tall on the original, with the 417px seal
              overlapping its right end. */}
          <div className="relative lg:h-[424px]">
            <div className="w-full max-w-[973px] text-brown" aria-hidden>
              <WavyWordmark text="Hey Cook" />
            </div>

            <RotatingBadge
              text="DISCOVER MEALS · PLAN THE WEEK · EAT BETTER · "
              className="absolute right-0 top-1 hidden text-brown lg:block"
              size={417}
            />
          </div>
        </section>

        {/* ---------- Tagline row: 480 illustration | 950 heading ----------
            Mirrors `.sec_le_cafe`: the illustration cluster sits in the left
            480px cell, and the heading cell holds the h2 plus the floating
            note (`.binocle_floating`). */}
        <section className="border-y-2 border-brown">
          <div className="flex min-h-[279px] flex-col sm:flex-row">
            <div className="flex w-full items-center justify-center border-b-2 border-brown px-6 py-8 sm:w-[480px] sm:shrink-0 sm:border-b-0 sm:border-r-2">
              <CookIllustration />
            </div>

            <div className="flex flex-1 flex-col justify-center gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-display text-4xl leading-[1.05] text-brown sm:text-[64px]">
                Decide what&apos;s for dinner once a week!
              </h2>
            </div>
          </div>
        </section>

        {/* ---------- Marquee band (97px) ---------- */}
        <Marquee items={TICKER} />

        {/* ---------- The catalog: real dishes from the seed library ---------- */}
        <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
          <div className="flex min-h-[256px] flex-col justify-between gap-6 md:flex-row md:items-start">
            <p className="max-w-[420px] text-lg leading-relaxed">
              Everything you cook, in one place. Ingredients, timings, servings
              and dietary tags — structured and searchable, so a recipe you
              loved in March is still one click away in November.
            </p>
            <div className="flex items-center gap-6">
              <h2 className="font-display text-5xl uppercase leading-none text-brown sm:text-[152px] sm:leading-[152px]">
                Your catalog
              </h2>
              <AuthCta
                className="btn-circle"
                signedOut={{ href: "/register", label: "→" }}
                signedIn={{ href: "/recipes", label: "→" }}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATALOG.map((dish) => (
              <article
                key={dish.title}
                className="card overflow-hidden transition-colors hover:bg-white"
              >
                <div className="relative h-52 border-b-2 border-brown">
                  <Image
                    src={dish.img}
                    alt={dish.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-2xl leading-tight">{dish.title}</h3>
                  <p className="mt-2 flex flex-wrap gap-x-4 text-sm uppercase opacity-70">
                    <span>{dish.time}</span>
                    <span>{dish.tag}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- The planner: what the product actually does ---------- */}
        <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display text-5xl uppercase leading-none text-brown sm:text-[152px] sm:leading-[152px]">
              One week
            </h2>
            <p className="max-w-[420px] text-lg leading-relaxed">
              Twenty-one slots, filled from recipes you already trust. Decide on
              Sunday, then stop deciding.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {WEEK.map((column) => (
              <div key={column.day} className="card p-4">
                <h3 className="text-xl uppercase">{column.day}</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {MEAL_SLOTS.map((slot, i) => (
                    <div key={slot}>
                      <p className="text-[0.65rem] uppercase tracking-wide opacity-60">
                        {slot}
                      </p>
                      {column.meals[i] ? (
                        <p className="mt-1 rounded-pill border-2 border-brown bg-yellow px-2.5 py-1 text-xs leading-snug">
                          {column.meals[i]}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs opacity-30">—</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Recipe Bot: the AI feature, shown rather than claimed ---------- */}
        <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[560px]">
              <h2 className="font-display text-5xl uppercase leading-none text-brown sm:text-[96px] sm:leading-[92px]">
                Recipe Bot
              </h2>
              <p className="mt-6 text-lg leading-relaxed">
                Out of ideas? Describe a craving or a constraint. It writes a
                complete recipe — ingredients, timings, a photo — straight into
                your catalog, ready to drop into the week.
              </p>
              <AuthCta
                className="btn btn-primary mt-8"
                signedOut={{ href: "/register", label: "Try it free" }}
                signedIn={{ href: "/chat", label: "Open Recipe Bot" }}
              />
            </div>

            <div className="card w-full max-w-[560px] space-y-4 p-6">
              <p className="ml-auto w-fit max-w-[80%] rounded-card rounded-br-none bg-red px-4 py-3 text-white">
                Something vegetarian I can make in 20 minutes
              </p>
              <p className="w-fit max-w-[85%] rounded-card rounded-bl-none border-2 border-brown bg-white px-4 py-3">
                Done — I&apos;ve added <strong>Veggie Stir Fry</strong> to your
                catalog. 25 minutes, serves 3.
              </p>
              <div className="flex items-center gap-4 rounded-card border-2 border-brown bg-yellow p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card border-2 border-brown">
                  <Image
                    src="/images/recipes/veggie-stir-fry.jpg"
                    alt="Veggie stir fry"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg leading-tight">Veggie Stir Fry</p>
                  <p className="text-sm uppercase opacity-70">25 min · Vegan</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Big question row: two 630 halves ---------- */}
        <section className="px-5 pb-0 pt-[30px] sm:px-[30px]">
          <div className="flex min-h-[266px] flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="w-full lg:w-[630px]">
              <h2 className="font-display text-5xl uppercase leading-none text-brown sm:text-[152px] sm:leading-[152px]">
                Hungry yet?
              </h2>
            </div>
            <div className="flex w-full justify-center lg:w-[630px] lg:justify-end">
              <AuthCta
                className="floating flex h-[120px] w-full max-w-[520px] items-center justify-center rounded-[50%] border-2 border-brown text-2xl uppercase transition-colors hover:bg-brown hover:text-yellow sm:text-4xl"
                signedOut={{ href: "/register", label: "Where do I start?" }}
                signedIn={{ href: "/meal-plans", label: "Plan this week" }}
              />
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="p-[30px]">
        <div className="card p-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h2 className="text-2xl uppercase">Contact</h2>
              <a
                href="mailto:hello@mealplanpro.app"
                className="mt-3 inline-block text-lg hover:underline"
              >
                hello@mealplanpro.app
              </a>
            </div>

            <div>
              <h2 className="text-2xl uppercase">The app</h2>
              <ul className="mt-3 space-y-1.5 text-lg">
                <li>
                  <Link href="/recipes" className="hover:underline">
                    Recipe catalog
                  </Link>
                </li>
                <li>
                  <Link href="/meal-plans" className="hover:underline">
                    Weekly planner
                  </Link>
                </li>
                <li>
                  <Link href="/chat" className="hover:underline">
                    Recipe Bot
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-lg">Ready to plan a week?</p>
              <AuthCta
                className="mt-4 flex h-[76px] w-full max-w-[505px] items-center justify-center rounded-pill border-[3px] border-brown text-2xl uppercase transition-colors hover:bg-brown hover:text-yellow"
                signedOut={{ href: "/register", label: "Create account" }}
                signedIn={{ href: "/recipes", label: "Open the app" }}
              />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-brown pt-6">
            <p className="text-sm">© {new Date().getFullYear()}, MealPlan Pro</p>
            <AuthCta
              className="text-lg hover:underline"
              signedOut={{ href: "/login", label: "Sign in" }}
              signedIn={{ href: "/settings", label: "Account settings" }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
