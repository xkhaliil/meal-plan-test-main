"use client";

import { getCookingGifSources } from "@/lib/cookingGifSources";

/** When false, backdrop GIFs render; set `NEXT_PUBLIC_COOKING_GIFS=0` to disable them. */
function cookingGifsDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_COOKING_GIFS;
  if (v == null || v === "") return false;
  return v === "0" || v.toLowerCase() === "false";
}

/** Four corners / edges — avoids the nav band on app pages. */
const BACKDROP_FRAMES: readonly {
  top: string;
  left: string;
  w: number;
  rotate: number;
  opacity: number;
}[] = [
  { top: "10%", left: "2%", w: 120, rotate: -6, opacity: 0.52 },
  { top: "14%", left: "78%", w: 128, rotate: 8, opacity: 0.48 },
  { top: "68%", left: "4%", w: 115, rotate: 10, opacity: 0.5 },
  { top: "72%", left: "76%", w: 132, rotate: -10, opacity: 0.46 },
];

type CookingGifBackdropProps = {
  /** Tailwind z class; sit above page bg, below content (e.g. z-[1], z-[2]). */
  stackClass?: string;
  /** `fixed` = viewport (auth/landing). `absolute` = fill `relative` parent (e.g. `main`). */
  position?: "fixed" | "absolute";
};

/**
 * Four cooking GIFs per mount. Stack: page background (z-0) → this layer → content (`relative z-10`).
 */
export function CookingGifBackdrop({
  stackClass = "z-[1]",
  position = "fixed",
}: CookingGifBackdropProps) {
  if (cookingGifsDisabled()) return null;

  const srcs = getCookingGifSources();
  const posClass = position === "fixed" ? "fixed inset-0" : "absolute inset-0";

  return (
    <div
      className={`pointer-events-none overflow-hidden ${posClass} ${stackClass}`}
      aria-hidden
    >
      {srcs.map((src, i) => {
        const frame = BACKDROP_FRAMES[i]!;
        return (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            width={frame.w}
            height={Math.round(frame.w * 0.75)}
            className="absolute rounded-sm object-cover shadow-lg ring-1 ring-black/20"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.w,
              height: "auto",
              maxHeight: "min(26vh, 200px)",
              opacity: frame.opacity,
              transform: `rotate(${frame.rotate}deg)`,
            }}
            loading="lazy"
            decoding="async"
          />
        );
      })}
    </div>
  );
}
