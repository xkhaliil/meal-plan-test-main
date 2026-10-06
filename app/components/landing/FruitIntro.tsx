"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";
import { getLenis } from "@/app/components/motion/SmoothScroll";
import { dropFruit } from "./fruitPile";
import { announceReveal } from "./introSignal";

/**
 * Module scope, so it resets on a full page load but survives client-side
 * navigation: a reload plays the intro, coming back to /landing from inside
 * the app does not.
 */
let hasPlayedThisPageLoad = false;

/**
 * The landing intro, after agrumeafarm.it's loader: a serif percentage counts
 * to 100 while flat fruit drop from above under real physics (matter-js) and
 * pile up; a dark panel then rushes up from the bottom, covers everything, and
 * slides off the top to reveal the hero. The choreography, the fruit and how
 * they fall are the original's (see fruits.ts and fruitPile.ts); the colours
 * are the app's (`hero-wash` behind, zinc-900 counter and panel).
 *
 * Rendered in the server HTML so it covers the page from the first paint. It
 * is skipped outright under reduced motion and on client-side returns, hidden
 * by the root layout's noscript block without JavaScript, and it holds the
 * page still (Lenis stopped, overflow hidden) only for as long as it plays.
 */
export default function FruitIntro() {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (
        !el ||
        !backdrop.current ||
        !stage.current ||
        !counter.current ||
        !panel.current
      )
        return;

      if (prefersReducedMotion() || hasPlayedThisPageLoad) {
        // Before paint, so it never shows at all.
        gsap.set(el, { display: "none" });
        announceReveal();
        return;
      }
      hasPlayedThisPageLoad = true;

      const lenis = getLenis();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      let released = false;
      // Gives the page its scrollbar back. Everything measured while the
      // intro played was measured without it, a scrollbar's width too wide —
      // the hero's pin above all, which would then sit off-centre against
      // the page below it — so ScrollTrigger measures again.
      const release = () => {
        if (released) return;
        released = true;
        document.documentElement.style.overflow = "";
        lenis?.start();
        ScrollTrigger.refresh();
      };

      const pile = dropFruit(stage.current);
      let cancelled = false;

      const count = { value: 0 };
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        counter.current,
        { opacity: 0.2 },
        { opacity: 1, duration: 0.25 },
        0
      )
        .to(
          count,
          {
            value: 100,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => {
              if (counter.current) {
                counter.current.textContent = `${Math.round(count.value)}%`;
              }
            },
          },
          0.12
        )
        // The panel rushes up from the bottom…
        .fromTo(
          panel.current,
          { yPercent: 0 },
          { yPercent: -100, duration: 0.55, ease: "expo.out" },
          2.45
        )
        // …and once it covers the screen, the loader behind it is gone: the
        // page underneath is what the panel uncovers on its way out. The
        // scrollbar comes back now, while the panel hides the page shifting
        // to make room for it.
        .add(() => {
          pile.stop();
          gsap.set([backdrop.current, stage.current, counter.current], {
            display: "none",
          });
          release();
          announceReveal();
        })
        .to(
          panel.current,
          { yPercent: -200, duration: 0.68, ease: "sine.out" },
          "+=0.04"
        )
        .set(el, { display: "none" });

      // The count and the panel start once the fruit are falling (or have
      // been given up on), so the pile always has its time.
      pile.ready.then(() => {
        if (!cancelled) tl.play();
      });

      return () => {
        // Navigating away mid-intro must not leave the page frozen.
        cancelled = true;
        pile.stop();
        tl.kill();
        stage.current?.replaceChildren();
        release();
        announceReveal();
      };
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      className="fruit-intro fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
    >
      {/* The hero's own background, in a layer of its own so it can be
          dropped the moment the panel covers the screen. */}
      <div ref={backdrop} className="hero-wash absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          ref={counter}
          className="font-display text-[clamp(6rem,14.2vw,12.8rem)] leading-none tracking-tight text-zinc-900 lining-nums tabular-nums"
        >
          0%
        </span>
      </div>

      <div ref={stage} className="absolute inset-0" />

      <div
        ref={panel}
        // Parked below the screen with `top`, not a transform. GSAP reads any
        // starting transform back as pixels and adds its own on top: Tailwind
        // v4's translate-y-full (the separate `translate` property) and an
        // inline translateY(100%) both left every panel position a full screen
        // too low, so the panel rose only after the hero was revealed.
        className="absolute inset-x-0 top-full h-full bg-zinc-900 will-change-transform"
      />
    </div>
  );
}
