"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );
}

/**
 * Oversized wordmark with a looping liquid wave.
 *
 * The original is a Lottie animation of their logotype (973x524, looping), which
 * is brand artwork, so this reproduces the effect instead: heavy condensed text
 * pushed through turbulence + displacement, with the noise frequency animated so
 * the wave keeps moving. Blurring the noise first is what turns per-pixel grit
 * into a smooth undulation.
 */
export default function WavyWordmark({
  text,
  className = "",
  scale = 26,
}: {
  text: string;
  className?: string;
  scale?: number;
}) {
  const filterId = `wave-${text.replace(/\W/g, "").toLowerCase()}`;
  const animate = !usePrefersReducedMotion();

  return (
    <svg
      viewBox="0 0 973 524"
      className={`block w-full ${className}`}
      role="img"
      aria-label={text}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={filterId} x="-8%" y="-25%" width="116%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.002 0.011"
            numOctaves="1"
            seed="4"
            result="noise"
          >
            {animate && (
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.002 0.011;0.0026 0.015;0.002 0.011"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="3" result="smoothNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="smoothNoise"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      {/* textLength pins the word to the artboard width regardless of how the
          font measures, so it always fills the hero without overflowing. */}
      <text
        x="486"
        y="410"
        textAnchor="middle"
        textLength="930"
        lengthAdjust="spacingAndGlyphs"
        filter={`url(#${filterId})`}
        style={{
          fontFamily: "var(--font-anton), Impact, sans-serif",
          fontSize: "430px",
        }}
        fill="currentColor"
      >
        {text}
      </text>
    </svg>
  );
}
