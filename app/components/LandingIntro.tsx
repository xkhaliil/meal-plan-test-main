"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion";
import { getLenis } from "@/app/components/motion/SmoothScroll";

/** Vertical slats that lift away to reveal the page. */
const PANELS = 5;
/** Once per tab: a curtain on every navigation back would be tiresome. */
const SEEN_KEY = "mealplan:intro-seen";

/**
 * The opening curtain on the landing page.
 *
 * Rendered in the server HTML rather than mounted on the client, so it covers
 * the page from the very first paint — a client-only overlay would flash the
 * content first. Everything that hides it runs in `useGSAP`, which fires in a
 * layout effect, before the browser paints.
 *
 * `.landing-intro` is hidden outright when JavaScript is off (see the noscript
 * block in the root layout); otherwise a no-JS visitor would stare at a curtain
 * that never lifts.
 */
export default function LandingIntro() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const skip =
        prefersReducedMotion() ||
        (() => {
          try {
            return sessionStorage.getItem(SEEN_KEY) === "1";
          } catch {
            return false;
          }
        })();

      if (skip) {
        // Before paint, so it never appears at all.
        gsap.set(el, { display: "none" });
        return;
      }

      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* private mode: the intro just plays again next time */
      }

      // Hold the page still underneath the curtain.
      const lenis = getLenis();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";

      const release = () => {
        document.documentElement.style.overflow = "";
        lenis?.start();
      };

      const tl = gsap.timeline({ onComplete: release });

      // 1. The wordmark rises into its mask, letter by letter.
      tl.fromTo(
        "[data-intro-letter]",
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: EASE.expo,
          stagger: 0.045,
        }
      )
        // 2. The count and the rule run alongside it.
        .fromTo(
          "[data-intro-meta]",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          0.25
        )
        .to(
          { value: 0 },
          {
            value: 100,
            duration: 1.5,
            ease: "power1.inOut",
            onUpdate() {
              const { value } = this.targets()[0] as { value: number };
              if (counter.current) {
                counter.current.textContent = String(
                  Math.round(value)
                ).padStart(3, "0");
              }
            },
          },
          0.25
        )
        .fromTo(
          "[data-intro-rule]",
          { scaleX: 0 },
          { scaleX: 1, duration: 1.5, ease: "power1.inOut" },
          0.25
        )
        // 3. Everything on the curtain leaves before the curtain does.
        .to("[data-intro-content]", {
          opacity: 0,
          duration: 0.35,
          ease: "power2.in",
        })
        // 4. The slats lift, last one first, so the reveal sweeps right to left.
        .to(
          "[data-intro-panel]",
          {
            yPercent: -100,
            duration: 1,
            ease: EASE.expo,
            stagger: { each: 0.07, from: "end" },
          },
          "-=0.1"
        )
        // 5. The hero arrives just behind the slats rather than after them.
        .fromTo(
          "[data-intro-reveal]",
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: EASE.expo,
            stagger: 0.09,
            clearProps: "transform,opacity",
          },
          "-=0.75"
        )
        .set(el, { display: "none" });

      return () => {
        // Navigating away mid-animation must not leave the page frozen.
        release();
      };
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      className="landing-intro fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {/* The slats themselves — the curtain is made of these. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: PANELS }).map((_, i) => (
          <span
            key={i}
            data-intro-panel
            className="h-full flex-1 bg-brown"
            style={{ willChange: "transform" }}
          />
        ))}
      </div>

      <div
        data-intro-content
        className="relative flex h-full w-full flex-col items-center justify-center px-5"
      >
        <p className="flex overflow-hidden">
          {"MEALPLAN".split("").map((letter, i) => (
            <span key={i} className="block overflow-hidden">
              <span
                data-intro-letter
                className="block font-display text-[clamp(2.5rem,12vw,140px)] uppercase leading-[0.9] text-yellow"
              >
                {letter}
              </span>
            </span>
          ))}
        </p>

        <p
          data-intro-meta
          className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-yellow/60"
        >
          Plan the week
        </p>

        {/* A rule that fills as the count runs. */}
        <span
          data-intro-rule
          className="mt-10 h-0.5 w-[min(320px,70vw)] origin-left bg-yellow/40"
        />

        <span
          data-intro-meta
          className="absolute bottom-8 right-6 font-display text-2xl text-yellow/70 sm:bottom-10 sm:right-10 sm:text-4xl"
        >
          <span ref={counter}>000</span>
        </span>
      </div>
    </div>
  );
}
