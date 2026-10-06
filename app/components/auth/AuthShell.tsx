import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";

type AuthShellProps = {
  /** A quiet row of reassurances under the card. Three at most. */
  points?: string[];
  /** Where the corner link goes. Defaults to the marketing page. */
  back?: { href: string; label: string };
  children: React.ReactNode;
};

/**
 * The frame the sign-in, register and checkout-return pages sit in: a centred
 * column on the same soft blue wash as the landing hero, with the wordmark top
 * left — faceiqlabs.com's restraint applied to a form.
 *
 * It provides the `#main` landmark the skip link in the root layout points at.
 */
export default function AuthShell({
  points,
  back = { href: "/landing", label: "Back to site" },
  children,
}: AuthShellProps) {
  return (
    <div className="hero-wash flex min-h-screen flex-col">
      <header className="px-5 pt-5 sm:px-8 sm:pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Wordmark href="/landing" />
          <Link
            href={back.href}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-900"
          >
            <span aria-hidden>←</span> {back.label}
          </Link>
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16"
      >
        <div className="w-full max-w-[420px]">{children}</div>
      </main>

      {points && points.length > 0 && (
        <footer className="px-5 pb-8">
          <ul className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-zinc-400">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <span aria-hidden className="text-zinc-900">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  );
}
