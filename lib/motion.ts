"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

  // Easing curves and timings taken from khalilltaief.com so motion here reads
  // the same as the portfolio: a cubic ease-out for reveals, a light overshoot
  // for playful accents, and an expo-out for longer travel.
  CustomEase.create("kl-reveal", "0.215, 0.61, 0.355, 1");
  CustomEase.create("kl-spring", "0.34, 1.64, 0.64, 1");
  CustomEase.create("kl-expo", "0.32, 0.72, 0, 1");
}

export const EASE = {
  reveal: "kl-reveal",
  spring: "kl-spring",
  expo: "kl-expo",
} as const;

export const DURATION = {
  micro: 0.2,
  base: 0.55,
  reveal: 0.75,
} as const;

/** The portfolio staggers indexed elements ~70ms apart. */
export const STAGGER = 0.07;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger, SplitText };
