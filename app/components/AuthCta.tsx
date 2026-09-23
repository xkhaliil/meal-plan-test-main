"use client";

import Link from "next/link";
import { useAuthUser } from "@/lib/useAuthUser";

type Target = { href: string; label: string };

/**
 * A call to action that points somewhere sensible for the current session —
 * so a signed-in visitor isn't told to "get started" on an account they have.
 */
export default function AuthCta({
  signedOut,
  signedIn,
  className = "",
}: {
  signedOut: Target;
  signedIn: Target;
  className?: string;
}) {
  const user = useAuthUser();
  const target = user ? signedIn : signedOut;

  return (
    <Link href={target.href} className={className}>
      {target.label}
    </Link>
  );
}
