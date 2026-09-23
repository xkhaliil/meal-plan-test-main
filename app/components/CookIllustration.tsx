"use client";

import { useEffect, useRef } from "react";

/** How far a pupil can travel from centre, in SVG units. */
const PUPIL_TRAVEL = 5;
/** Cursor distance at which the eyes reach full travel. */
const FULL_TRAVEL_AT = 320;
/** Per-frame easing toward the cursor — higher is snappier. */
const SMOOTHING = 0.42;

/**
 * Chef face whose eyes track the cursor, plus a carrot — the meal-planning
 * stand-ins for the globe/smiley/flower cluster in `.div_glob_img` on
 * cafebinocle.com. Pupils are moved by writing the transform straight to the
 * DOM rather than through state, so a mousemove doesn't re-render React.
 */
export default function CookIllustration() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftPupil = useRef<SVGCircleElement>(null);
  const rightPupil = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let running = false;

    const render = () => {
      // Ease toward the cursor each frame. A rAF lerp tracks continuously and
      // settles quickly; a CSS transition would impose a fixed delay on every
      // pointer move and always lag behind the cursor.
      current.x += (target.x - current.x) * SMOOTHING;
      current.y += (target.y - current.y) * SMOOTHING;

      const transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
      if (leftPupil.current) leftPupil.current.style.transform = transform;
      if (rightPupil.current) rightPupil.current.style.transform = transform;

      // Stop once settled so we aren't burning frames while the cursor is still.
      if (
        Math.abs(target.x - current.x) > 0.01 ||
        Math.abs(target.y - current.y) > 0.01
      ) {
        frame = requestAnimationFrame(render);
      } else {
        running = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const box = svg.getBoundingClientRect();
      if (!box.width) return;

      // Eye line sits a little above the middle of the face.
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height * 0.54);
      const distance = Math.hypot(dx, dy);
      if (distance < 1) return;

      const reach = Math.min(distance, FULL_TRAVEL_AT) / FULL_TRAVEL_AT;
      target.x = (dx / distance) * PUPIL_TRAVEL * reach;
      target.y = (dy / distance) * PUPIL_TRAVEL * reach;

      if (!running) {
        running = true;
        frame = requestAnimationFrame(render);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-5">
      {/* Chef */}
      <svg
        ref={svgRef}
        width="206"
        height="206"
        viewBox="0 0 206 206"
        fill="none"
        className="h-37.5 w-37.5 sm:h-45 sm:w-45"
        role="img"
        aria-label="Illustration of a chef"
      >
        {/* head */}
        <circle
          cx="103"
          cy="120"
          r="72"
          fill="#FEE26F"
          stroke="#594B3C"
          strokeWidth="5.33"
        />

        {/* toque */}
        <path
          d="M50 54C36 30 54 6 76 14 85-4 121-4 130 14c22-8 40 16 26 40z"
          fill="#fff"
          stroke="#594B3C"
          strokeWidth="5.33"
          strokeLinejoin="round"
        />
        <rect
          x="48"
          y="50"
          width="110"
          height="28"
          rx="8"
          fill="#fff"
          stroke="#594B3C"
          strokeWidth="5.33"
        />

        {/* eye whites */}
        <ellipse cx="80" cy="112" rx="15" ry="21" fill="#fff" />
        <ellipse cx="126" cy="112" rx="15" ry="21" fill="#fff" />

        {/* pupils — these follow the cursor */}
        <circle
          ref={leftPupil}
          cx="80"
          cy="113"
          r="7"
          fill="#594B3C"
        />
        <circle
          ref={rightPupil}
          cx="126"
          cy="113"
          r="7"
          fill="#594B3C"
        />

        {/* smile */}
        <path
          d="M124 150c0 11.6-9.4 21-21 21s-21-9.4-21-21"
          stroke="#594B3C"
          strokeWidth="5.33"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Carrot */}
      <svg
        width="95"
        height="167"
        viewBox="0 0 95 167"
        fill="none"
        className="h-30 w-auto sm:h-37.5"
        aria-hidden
      >
        <path
          d="M47.5 66V26"
          stroke="#594B3C"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M47.5 64C28 66 8 54 14 42c6-11 26-2 33.5 22Z"
          fill="#00A881"
          stroke="#594B3C"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M47.5 64C67 66 87 54 81 42c-6-11-26-2-33.5 22Z"
          fill="#00A881"
          stroke="#594B3C"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M28 68h39l-14 88c-2 8-9 8-11 0Z"
          fill="#EF5B34"
          stroke="#594B3C"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M37 94h20M40 118h14M43 138h8"
          stroke="#594B3C"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
