"use client";

import ChefLogo from "@/app/components/ChefLogo";
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
        className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${
          active ? "bg-terracotta-soft text-terracotta" : "text-muted hover:text-ink"
        }`}
      >
        {link.label}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/85 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/recipes" className="flex shrink-0 items-center gap-2.5">
            <ChefLogo size={28} href={null} />
            <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-ink">
              MealPlan Pro
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks}
            <span className="mx-2 h-5 w-px bg-line" aria-hidden />
            <button onClick={handleLogout} className="btn btn-ghost">
              Log out
            </button>
          </div>

          <button onClick={handleLogout} className="btn btn-ghost md:hidden">
            Log out
          </button>
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto pb-2 md:hidden">
          {navLinks}
        </div>
      </nav>
    </header>
  );
}
