"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";

// Settings and Log out live in the avatar menu on the right.
const LINKS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal plans" },
  { href: "/chat", label: "Chef Ferraro" },
];

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = LINKS.map((link) => {
    const active = pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`shrink-0 rounded-pill border-2 px-4 py-2 text-sm uppercase tracking-wide transition-colors ${
          active
            ? "border-brown bg-brown text-yellow"
            : "border-transparent text-brown hover:border-brown"
        }`}
      >
        {link.label}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-20 border-b-2 border-brown bg-yellow">
      <nav className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href="/recipes" className="flex shrink-0 items-center gap-3">
            <span className="whitespace-nowrap font-display text-xl uppercase leading-none text-brown sm:text-2xl">
              MealPlan
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{navLinks}</div>
            <UserMenu />
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-3 md:hidden">
          {navLinks}
        </div>
      </nav>
    </header>
  );
}
