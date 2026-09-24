"use client";

import Link from "next/link";
import { useAuthUser } from "@/lib/useAuthUser";

const PILL =
  "flex h-14 shrink-0 items-center justify-center rounded-pill bg-red px-5 text-sm uppercase text-brown transition-all duration-300 hover:bg-brown hover:text-yellow sm:h-[76px] sm:w-[220px] sm:px-0 sm:text-2xl";
const CIRCLE =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-brown text-xs uppercase transition-all duration-300 hover:bg-brown hover:text-yellow sm:h-[76px] sm:w-[76px] sm:text-lg";

export default function LandingHeaderActions() {
  const user = useAuthUser();

  if (user) {
    const initial = user.name?.trim().charAt(0).toUpperCase() || "?";
    return (
      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:gap-5">
        <Link href="/recipes" className={PILL}>
          Start cooking
        </Link>
        <Link
          href="/meal-plans"
          className={`${CIRCLE} hidden sm:flex`}
          title="Your meal plans"
        >
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
    <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:gap-5">
      <Link href="/register" className={PILL}>
        Get started
      </Link>
      <Link
        href="/recipes"
        className={`${CIRCLE} hidden sm:flex`}
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
