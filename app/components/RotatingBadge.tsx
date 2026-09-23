import Image from "next/image";

/**
 * Circular seal with text set around the rim, rotating slowly, with a mark in
 * the middle — the badge beside the hero wordmark on cafebinocle.com
 * (their `logo-rotate` keyframe). Only the rim text spins; the centre mark
 * stays upright.
 */
export default function RotatingBadge({
  text,
  size = 300,
  className = "",
  mark = "/images/chef-badge.png",
  markAlt = "",
}: {
  text: string;
  size?: number;
  className?: string;
  mark?: string;
  markAlt?: string;
}) {
  const pathId = `seal-${size}`;

  // The outer element takes the caller's classes (including any positioning);
  // the inner one owns `relative` so the centre mark can anchor to it. Putting
  // `relative` on the outer element would beat an `absolute` passed in, since
  // Tailwind emits `.relative` after `.absolute`.
  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="relative h-full w-full">
        <svg viewBox="0 0 200 200" className="logo-rotate h-full w-full" aria-hidden>
          <defs>
            <path
              id={pathId}
              d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"
              fill="none"
            />
          </defs>
          <text
            fill="currentColor"
            style={{
              fontFamily: "var(--font-grotesk), sans-serif",
              fontSize: "19px",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            <textPath href={`#${pathId}`} startOffset="0%">
              {text}
            </textPath>
          </text>
        </svg>

        {/* Centre mark */}
        <div className="pointer-events-none absolute inset-[24%]">
          <Image
            src={mark}
            alt={markAlt}
            fill
            sizes={`${Math.round(size * 0.52)}px`}
            className="object-contain"
            aria-hidden={markAlt === ""}
          />
        </div>
      </div>
    </div>
  );
}
