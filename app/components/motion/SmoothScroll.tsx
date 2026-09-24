"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";

let instance: Lenis | null = null;

/** The page-wide Lenis instance, or null when smooth scrolling is off. */
export function getLenis() {
  return instance;
}

/**
 * Smooth (inertial) window scrolling.
 *
 * Lenis animates the real scroll position rather than transforming a wrapper
 * the way GSAP's ScrollSmoother does, so the sticky app navbar keeps sticking.
 * Its RAF is driven off gsap.ticker so Lenis writes the scroll position and
 * ScrollTrigger reads it inside the same frame — otherwise the reveals lag a
 * frame behind the content they're pinned to.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      // Damped, not timed. `duration` + an easing curve restarts a fixed-length
      // animation on every wheel tick, so the page keeps gliding after the
      // wheel stops; damping is proportional to the distance left, which stops
      // when you stop. High lambda = close to native, just without the steps —
      // and it doesn't stack a second inertia on top of trackpad momentum.
      lerp: 0.18,
      smoothWheel: true,
      // Touch devices keep their own native scrolling.
      syncTouch: false,
      // Lenis animates in-page #hash links itself.
      anchors: true,
      // A nested scroller consumes the wheel until it hits its own edge.
      allowNestedScroll: true,
      // Leftover momentum shouldn't carry into the next page.
      stopInertiaOnNavigate: true,
      autoRaf: false,
    });
    instance = lenis;

    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    // gsap's lag smoothing would let the ticker skip time Lenis needs.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, []);

  return null;
}
