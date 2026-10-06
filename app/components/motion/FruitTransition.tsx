"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import {
  dropFruit,
  preloadFruitPhysics,
} from "@/app/components/landing/fruitPile";
import { ARRIVE_KEY, ARRIVING } from "@/lib/arrival";
import { useTransitionStore } from "@/lib/stores/transitionStore";

/** The pile's time to fill the screen before the panel rises: the intro's. */
const FULL_AT = 2.45;

/**
 * The way into the app after signing in or up: the landing intro without its
 * count. The screen washes over, the fruit drop and pile up, and once they
 * fill it the dark panel rushes up; the app opens underneath, and the panel
 * lifts off to show it.
 *
 * The app is opened with a full page load, not a client-side push. The
 * router keeps what it prefetched while the visitor was signed out — the
 * landing page prefetches /recipes, and the proxy answered that with a
 * redirect to /login — and replayed it after sign-in, so the push went
 * nowhere. A full load is judged afresh by the proxy, on the new cookie.
 * Browsers hold the last frame, the dark panel, until the new page paints,
 * and that page starts under an identical panel (see lib/arrival.ts), which
 * this component then lifts.
 *
 * It lives in the root layout, so it is there on every page: to play, and
 * to finish the job on the page it lands on.
 */
export default function FruitTransition() {
  const destination = useTransitionStore((s) => s.destination);
  const pathname = usePathname();
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const arrival = useRef<HTMLDivElement>(null);

  // The physics is only needed here, so it is fetched on the pages that can
  // start the transition, ahead of the moment it plays.
  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") {
      void preloadFruitPhysics();
    }
  }, [pathname]);

  // Landed: lift the panel the page started under.
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains(ARRIVING)) return;
    try {
      sessionStorage.removeItem(ARRIVE_KEY);
    } catch {}
    const done = () => html.classList.remove(ARRIVING);
    if (prefersReducedMotion() || !arrival.current) {
      done();
      return;
    }
    const tween = gsap.fromTo(
      arrival.current,
      { yPercent: 0 },
      {
        yPercent: -100,
        duration: 0.68,
        ease: "sine.out",
        delay: 0.1,
        onComplete: done,
      }
    );
    // The class stays: in development React runs this effect twice, and the
    // second run must find it to lift the panel again.
    return () => {
      tween.kill();
    };
  }, []);

  // Coming back to the page it left (the back button restores it as it was,
  // panel and all) puts the page back in view.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) useTransitionStore.getState().finish();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!destination) return;
    const go = () => {
      try {
        sessionStorage.setItem(ARRIVE_KEY, "1");
      } catch {}
      window.location.assign(destination);
    };
    if (prefersReducedMotion() || !stage.current || !panel.current) {
      window.location.assign(destination);
      return;
    }

    let cancelled = false;
    const pile = dropFruit(stage.current);
    const tl = gsap.timeline({ paused: true });
    tl.to(backdrop.current, { opacity: 1, duration: 0.5, ease: "power2.out" })
      // The panel rushes up from the bottom…
      .fromTo(
        panel.current,
        { yPercent: 0 },
        { yPercent: -100, duration: 0.55, ease: "expo.out" },
        FULL_AT
      )
      // …and with the screen covered, the app is opened underneath it.
      .add(() => {
        pile.stop();
        go();
      });

    // As in the intro, the clock starts once the fruit are falling.
    pile.ready.then(() => {
      if (!cancelled) tl.play();
    });

    return () => {
      cancelled = true;
      pile.stop();
      tl.kill();
    };
  }, [destination]);

  return (
    <>
      {destination && (
        <div className="fixed inset-0 z-[100] overflow-hidden" aria-hidden>
          <div
            ref={backdrop}
            className="hero-wash absolute inset-0 opacity-0"
          />
          <div ref={stage} className="absolute inset-0" />
          {/* Parked below the screen with `top`, as in FruitIntro: GSAP would
              add its own transform on top of a starting one. */}
          <div
            ref={panel}
            className="absolute inset-x-0 top-full h-full bg-zinc-900 will-change-transform"
          />
        </div>
      )}
      {/* The panel a page starts under after the transition; shown from the
          first paint by the head script's class, so there is no flash of
          the page before it. */}
      <div
        ref={arrival}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] hidden bg-zinc-900 will-change-transform [html.mp-arriving_&]:block"
      />
    </>
  );
}
