"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  gsap,
  SplitText,
  EASE,
  DURATION,
  STAGGER,
  prefersReducedMotion,
} from "@/lib/motion";

type RevealTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
  start?: string;
};

/**
 * Masked line reveal — each line sits in an overflow-hidden mask and slides up,
 * staggered. Mirrors the intro line treatment on khalilltaief.com.
 */
export default function RevealText({
  children,
  className,
  as: Tag = "h2",
  delay = 0,
  start = "top 88%",
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (prefersReducedMotion()) {
        gsap.set(el, { opacity: 1 });
        return;
      }

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "reveal-line",
      });

      gsap.set(el, { opacity: 1 });
      gsap.from(split.lines, {
        yPercent: 110,
        duration: DURATION.reveal,
        ease: EASE.reveal,
        stagger: STAGGER,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      });

      return () => split.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref as React.Ref<never>} className={className} data-reveal-text>
      {children}
    </Tag>
  );
}
