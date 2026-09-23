"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal plans" },
  { href: "/chat", label: "Recipe Bot" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

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
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brown bg-beige font-display text-lg">
              MP
            </span>
            <span className="whitespace-nowrap font-display text-xl uppercase leading-none text-brown sm:text-2xl">
              MealPlan
            </span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {navLinks}
            <button onClick={handleLogout} className="btn btn-secondary ml-2 py-2">
              Log out
            </button>
          </div>

          <button onClick={handleLogout} className="btn btn-secondary py-2 md:hidden">
            Log out
          </button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto pb-3 md:hidden">{navLinks}</div>
      </nav>
    </header>
  );
}
