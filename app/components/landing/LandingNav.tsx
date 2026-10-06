"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Wordmark from "@/app/components/Wordmark";
import { useAuthUser } from "@/lib/useAuthUser";
import { cn } from "@/lib/utils";
import { PrimaryNavButton, SecondaryNavButton } from "./NavButtons";

const SECTIONS = [
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
];

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * The floating bar: a frosted island that drops in once the hero, which has
 * its own header, has scrolled away. Mark, the page's sections, and the way
 * in, split by hairlines.
 *
 * A soft pill glides under whichever section link the pointer is on and
 * rests on the section being read (a line across the middle of the screen
 * decides which), so the bar always says where you are. It is moved by hand
 * rather than through state: it follows the pointer, and re-rendering the
 * bar for that would be wasted work.
 *
 * Hidden means hidden for everyone: `inert` and `aria-hidden` keep the
 * keyboard and screen readers off links nobody can see.
 */
export default function LandingNav() {
  const user = useAuthUser();
  // Starts hidden: the server-rendered page opens on the hero.
  const [hidden, setHidden] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const hovered = useRef<string | null>(null);

  useEffect(() => {
    const hero = document.getElementById("plate-hero");
    if (!hero) {
      const frame = requestAnimationFrame(() => setHidden(false));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      ([entry]) => setHidden(entry.intersectionRatio > 0.2),
      { threshold: [0, 0.2, 0.5, 1] }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          setActive((prev) =>
            entry.isIntersecting ? id : prev === id ? null : prev
          );
        }
      },
      // A line across the middle of the screen.
      { rootMargin: "-50% 0px -50% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const movePill = useCallback((id: string | null) => {
    const el = pill.current;
    const link = id ? links.current.get(id) : undefined;
    if (!el) return;
    if (!link) {
      el.style.opacity = "0";
      return;
    }
    // Appearing, it fades in where it is needed; only once it is showing
    // does it glide from link to link.
    if (el.style.opacity !== "1") {
      el.style.transition = "none";
      el.style.width = `${link.offsetWidth}px`;
      el.style.transform = `translateX(${link.offsetLeft}px)`;
      void el.offsetWidth;
      el.style.transition = "";
    }
    el.style.width = `${link.offsetWidth}px`;
    el.style.transform = `translateX(${link.offsetLeft}px)`;
    el.style.opacity = "1";
  }, []);

  useEffect(() => {
    if (!hovered.current) movePill(active);
  }, [active, movePill]);

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:px-6"
      aria-hidden={hidden || undefined}
      inert={hidden}
    >
      <nav
        aria-label="Main"
        className={cn(
          "pointer-events-auto flex h-14 w-full items-center gap-1 rounded-full border border-white/70 bg-white/75 pl-4 pr-1.5 backdrop-blur-xl backdrop-saturate-150 sm:w-auto sm:pl-5",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_0_0_1px_rgba(24,24,27,0.06),0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-16px_rgba(24,24,27,0.25)]",
          "transition-[transform,opacity] duration-500 motion-reduce:transition-none",
          EASE,
          hidden
            ? "-translate-y-[calc(100%+24px)] opacity-0"
            : "translate-y-0 opacity-100"
        )}
      >
        <Wordmark href="/landing" className="mr-auto pr-2 sm:mr-0" />

        <span
          aria-hidden
          className="mx-2 hidden h-5 w-px bg-zinc-200 md:block"
        />

        <div
          className="relative hidden items-center md:flex"
          onMouseLeave={() => {
            hovered.current = null;
            movePill(active);
          }}
        >
          <span
            ref={pill}
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-zinc-900/[0.06] opacity-0 transition-[transform,width,opacity] duration-300 motion-reduce:transition-none",
              EASE
            )}
          />
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              ref={(el) => {
                if (el) links.current.set(s.id, el);
                else links.current.delete(s.id);
              }}
              onMouseEnter={() => {
                hovered.current = s.id;
                movePill(s.id);
              }}
              aria-current={active === s.id ? "location" : undefined}
              className={cn(
                "relative rounded-full px-4 py-2.5 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900/25",
                active === s.id
                  ? "text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {s.label}
            </a>
          ))}
        </div>

        <span
          aria-hidden
          className="mx-2 hidden h-5 w-px bg-zinc-200 md:block"
        />

        <SecondaryNavButton
          variant="ghost"
          href={user ? "/recipes" : "/login"}
          label={user ? "My recipes" : "Sign in"}
          icon={user ? "recipes" : "account"}
          className="hidden sm:inline-flex"
        />
        <PrimaryNavButton
          href={user ? "/recipes" : "/register"}
          label={user ? "Open the app" : "Start planning free"}
          phoneLabel={user ? "Open app" : "Sign up"}
        />
      </nav>
    </header>
  );
}
