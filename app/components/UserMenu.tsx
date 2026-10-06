"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, useAuthUser } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";

/**
 * The account cluster in the navbar: an avatar button that opens Settings and
 * Log out. It's a plain popover rather than an ARIA menu — the two items are a
 * link and a button, which screen readers and the keyboard already handle,
 * and role="menu" would promise arrow-key navigation this doesn't implement.
 */
export default function UserMenu() {
  const user = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Navigating away (including via Settings below) should leave it closed.
  // Adjusted during render rather than in an effect, so it never paints open
  // on the page it just left.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    // pointerdown, not click: it lands before the page-transition handler that
    // swallows link clicks in the capture phase.
    function onPointerDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    // Clears the httpOnly cookie, the stored token and the store in one place.
    await useAuthStore.getState().signOut();
    setOpen(false);
    router.push("/login");
  }

  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";
  const onSettings = pathname.startsWith("/settings");

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={user ? `Account: ${user.name}` : "Account"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
          open || onSettings
            ? "bg-zinc-900 text-white"
            : "bg-zinc-900 text-white hover:bg-zinc-700"
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_40px_-16px_rgba(24,24,27,0.18)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-zinc-100 px-4 py-3.5">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {user?.name ?? "Your account"}
            </p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {user.email}
              </p>
            )}
            {user?.plan && (
              <span className="tag mt-2.5 capitalize">{user.plan}</span>
            )}
          </div>

          <div className="p-1.5">
            <Link
              href="/settings"
              aria-current={onSettings ? "page" : undefined}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Settings
              <span aria-hidden className="text-zinc-400">
                →
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Log out
              <span aria-hidden>↪</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
