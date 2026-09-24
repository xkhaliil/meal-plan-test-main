"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import {
  gsap,
  ScrollTrigger,
  EASE,
  DURATION,
  prefersReducedMotion,
} from "@/lib/motion";
import { getLenis } from "./SmoothScroll";

/** Fade-out before a push; kept short so navigation never feels stalled. */
const EXIT = 0.22;
/** If a push never resolves, put the page back rather than leave it blank. */
const RECOVER_AFTER = 1500;

function isPlainLeftClick(e: MouseEvent) {
  return (
    e.button === 0 &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey &&
    !e.defaultPrevented
  );
}

/**
 * Cross-fades App Router navigations.
 *
 * The router swaps the tree synchronously, so an exit animation only exists if
 * the click is held back: a capture-phase listener runs before React's own
 * delegated handler, plays the fade, and then pushes itself. Anything it
 * doesn't recognise (new tab, external host, downloads, in-page anchors, or
 * `data-no-transition`) is left to Next's <Link> untouched.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const firstRender = useRef(true);
  const scrollToTop = useRef(false);
  const recovery = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    function onClick(e: MouseEvent) {
      if (!isPlainLeftClick(e)) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.dataset.noTransition !== undefined) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const here = window.location.pathname + window.location.search;
      const there = url.pathname + url.search;
      // Same document: either an in-page anchor (Lenis scrolls it) or a link
      // back to the page we're on, which would fade out and never come back.
      if (there === here) return;

      e.preventDefault();
      e.stopPropagation();

      scrollToTop.current = true;
      gsap.to(root.current, {
        opacity: 0,
        y: -8,
        duration: EXIT,
        ease: "power1.in",
        overwrite: true,
        onStart: () => gsap.set(root.current, { pointerEvents: "none" }),
        onComplete: () => {
          router.push(url.pathname + url.search + url.hash);
          recovery.current = setTimeout(() => {
            gsap.to(root.current, {
              opacity: 1,
              y: 0,
              duration: DURATION.micro,
              clearProps: "pointerEvents,transform",
            });
          }, RECOVER_AFTER);
        },
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useGSAP(
    () => {
      // The server already painted the first route; fading it in from nothing
      // would just flash.
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }

      if (recovery.current) {
        clearTimeout(recovery.current);
        recovery.current = null;
      }

      if (scrollToTop.current) {
        scrollToTop.current = false;
        // Next resets the window scroll itself, but Lenis holds its own
        // position and would smoothly drag the new page back down.
        getLenis()?.scrollTo(0, { immediate: true, force: true });
      }

      // Clicks work again the moment the new page starts coming in, not when
      // the fade finishes.
      gsap.set(root.current, { pointerEvents: "auto" });

      if (prefersReducedMotion()) {
        gsap.set(root.current, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        root.current,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: DURATION.base,
          ease: EASE.expo,
          overwrite: true,
          // Leaving a transform behind would make this a containing block for
          // the sticky navbar.
          clearProps: "transform",
          // New page, new heights — but measure once the transform is gone, or
          // every trigger is off by the tween's remaining offset.
          onComplete: () => {
            getLenis()?.resize();
            ScrollTrigger.refresh();
          },
        }
      );
    },
    { dependencies: [pathname], scope: root }
  );

  return (
    <div ref={root} className="flex w-full flex-1 flex-col">
      {children}
    </div>
  );
}
