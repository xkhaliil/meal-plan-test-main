"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  gsap,
  EASE,
  DURATION,
  STAGGER,
  prefersReducedMotion,
} from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Children to stagger. Defaults to direct children of the wrapper. */
  selector?: string;
  /** Travel distance in px. */
  y?: number;
  delay?: number;
  /** ScrollTrigger start position. */
  start?: string;
  as?: "div" | "section" | "ul";
  /**
   * Re-run when these change. Needed on pages that render their children after
   * an async fetch, since the first pass has nothing to animate.
   */
  deps?: unknown[];
};

export default function Reveal({
  children,
  className,
  selector = "[data-reveal-item]",
  y = 24,
  delay = 0,
  start = "top 85%",
  as: Tag = "div",
  deps = [],
}: RevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(selector, root.current);
      const targets = items.length
        ? items
        : gsap.utils.toArray<HTMLElement>(":scope > *", root.current);
      if (!targets.length) return;

      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: DURATION.base,
          ease: EASE.reveal,
          stagger: STAGGER,
          delay,
          scrollTrigger: { trigger: root.current, start, once: true },
        }
      );
    },
    { scope: root, dependencies: deps, revertOnUpdate: true }
  );

  return (
    <Tag ref={root as React.Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
