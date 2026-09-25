import Link from "next/link";
import ChefLogo from "@/app/components/ChefLogo";

type AuthShellProps = {
  /** Small caps line above the statement. */
  eyebrow: string;
  /**
   * The brand panel's editorial line. Deliberately *not* the page's `h1` —
   * that belongs to the form column, so the two never say the same thing twice
   * in the accessibility tree.
   */
  statement: string;
  blurb: string;
  /** Three at most: the list is the panel's whole lower half on a laptop. */
  points: string[];
  /** Where the corner link goes. Defaults to the marketing page. */
  back?: { href: string; label: string };
  children: React.ReactNode;
};

/**
 * The split-screen frame both auth pages sit in: a brown brand panel on the
 * left, the form on the yellow ground to its right, divided by the same 2px
 * brown rule that separates every band on the landing page.
 *
 * On a phone the panel collapses into a short masthead — logo and statement
 * only — and the list and the seal drop away rather than pushing the form
 * below the fold.
 *
 * It also provides the `#main` landmark that the skip link in the root layout
 * points at; before this, that link had nowhere to go on either page.
 */
export default function AuthShell({
  eyebrow,
  statement,
  blurb,
  points,
  back = { href: "/landing", label: "Back to site" },
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative isolate overflow-hidden border-b-2 border-brown bg-brown px-5 py-6 sm:px-8 lg:flex lg:w-[44%] lg:max-w-[640px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r-2 lg:px-12 lg:py-12">
        {/* Outlined rings — the same geometry the landing sections lean on. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-28 top-28 hidden h-80 w-80 rounded-full border-2 border-yellow/15 lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 top-[55%] hidden h-56 w-56 rounded-full border-2 border-red/40 lg:block"
        />

        <div className="relative flex items-center justify-between gap-4">
          <Link href="/landing" className="flex items-center gap-2.5">
            <ChefLogo size={34} href={null} priority />
            <span className="font-display text-lg uppercase leading-none text-yellow sm:text-xl">
              MealPlan Pro
            </span>
          </Link>

          <Link
            href={back.href}
            className="shrink-0 text-[0.6rem] uppercase tracking-[0.2em] text-yellow/60 transition-colors hover:text-yellow sm:text-[0.65rem]"
          >
            <span aria-hidden>←</span> {back.label}
          </Link>
        </div>

        <div className="relative mt-7 lg:mt-auto lg:pt-20">
          <p className="text-[0.6rem] uppercase tracking-[0.35em] text-yellow/50 sm:text-[0.65rem]">
            {eyebrow}
          </p>
          <p className="mt-3 font-display text-[1.75rem] uppercase leading-[0.95] text-yellow sm:text-4xl lg:mt-5 lg:text-[clamp(2.5rem,3.8vw,64px)]">
            {statement}
          </p>
          <p className="mt-3 hidden max-w-[40ch] text-sm leading-relaxed text-yellow/70 sm:block lg:mt-6 lg:text-base">
            {blurb}
          </p>
        </div>

        <ul className="relative mt-12 hidden lg:block">
          {points.map((point, i) => (
            <li
              key={point}
              className="flex items-baseline gap-5 border-t border-yellow/20 py-4 last:border-b"
            >
              <span className="font-display text-base leading-none text-red">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-yellow/85">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- Form column ---------- */}
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-14"
      >
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
