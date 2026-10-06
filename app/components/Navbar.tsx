"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";
import Wordmark from "@/app/components/Wordmark";
import { cn } from "@/lib/utils";

// Settings and Log out live in the avatar menu on the right.
const LINKS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal plans" },
  { href: "/chat", label: "Chef Ferraro" },
];

/**
 * The floating pill nav from faceiqlabs.com: frosted white, hairline border,
 * a soft zinc shadow, sitting 16px clear of the top edge.
 *
 * Sticky rather than fixed, so it still takes up its own height in the flow —
 * the chat page is a full-height column and relies on that rather than on a
 * hard-coded offset. On a phone the links drop to a second row inside the
 * same pill instead of hiding behind a menu: there are only three of them.
 */
export default function Navbar() {
  const pathname = usePathname();

  const navLinks = LINKS.map((link) => {
    const active = pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
          active
            ? "bg-zinc-100 text-zinc-900"
            : "text-zinc-500 hover:text-zinc-900"
        )}
      >
        {link.label}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Main"
        className="glass mx-auto max-w-6xl rounded-[28px] border border-zinc-200/60 shadow-[0_10px_15px_-3px_rgba(228,228,231,0.3),0_4px_6px_-4px_rgba(228,228,231,0.3)] md:rounded-full"
      >
        <div className="flex h-14 items-center justify-between gap-4 pl-5 pr-2.5">
          <Wordmark href="/recipes" />

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">{navLinks}</div>
            <UserMenu />
          </div>
        </div>

        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-zinc-200/60 px-2.5 py-2 md:hidden">
          {navLinks}
        </div>
      </nav>
    </header>
  );
}
