"use client";

import Link from "next/link";
import { useAuthUser } from "@/lib/useAuthUser";

const PILL =
  "flex h-14 items-center justify-center rounded-pill bg-red px-6 text-base uppercase text-brown transition-all duration-300 hover:bg-brown hover:text-yellow sm:h-[76px] sm:w-[220px] sm:px-0 sm:text-2xl";
const CIRCLE =
  "flex h-14 w-14 items-center justify-center rounded-full border-2 border-brown text-sm uppercase transition-all duration-300 hover:bg-brown hover:text-yellow sm:h-[76px] sm:w-[76px] sm:text-lg";

export default function LandingHeaderActions() {
  const user = useAuthUser();

  if (user) {
    const initial = user.name?.trim().charAt(0).toUpperCase() || "?";
    return (
      <div className="flex items-center gap-4 sm:gap-5">
        <Link href="/recipes" className={PILL}>
          Start cooking
        </Link>
        <Link href="/meal-plans" className={CIRCLE} title="Your meal plans">
          Plans
        </Link>
        <Link
          href="/settings"
          className={CIRCLE}
          title={`Signed in as ${user.name}`}
          aria-label={`Account settings for ${user.name}`}
        >
          {initial}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <Link href="/register" className={PILL}>
        Get started
      </Link>
      <Link
        href="/recipes"
        className={CIRCLE}
        title="Browse the recipe catalog"
      >
        Browse
      </Link>
      <Link href="/login" className={CIRCLE} title="Sign in">
        Sign in
      </Link>
    </div>
  );
}
