import { cn } from "@/lib/utils";

/**
 * The app's mark: the chef holding a dish, with the AI's two sparkles — the
 * Chef Ferrero logo's symbol, drawn in the app's ink instead of its
 * terracotta. Inline, so it takes `currentColor` (zinc-900 unless a class
 * says otherwise) and costs no request.
 *
 * `size` is the mark's height; it is taller than it is wide (152 × 224).
 * Decorative by default, since a name always sits beside it; pass `title`
 * where it stands alone.
 */
export default function ChefLogo({
  size = 40,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="24 0 152 224"
      width={(size * 152) / 224}
      height={size}
      className={cn("shrink-0 text-zinc-900", className)}
      {...(title
        ? { role: "img", "aria-label": title }
        : { "aria-hidden": true })}
    >
      <g fill="currentColor" fillRule="evenodd">
        <g transform="rotate(-6 100 112)">
          <path d="M71 58 L67 44 A16 16 0 0 1 80 18 A24 24 0 0 1 120 18 A16 16 0 0 1 133 44 L129 58 Z" />
          <path d="M72 62 H128 a2 2 0 0 1 2 2 V74 H70 V64 a2 2 0 0 1 2 -2 Z" />
          <path d="M76 78 H124 V90 A24 22 0 0 1 76 90 Z" />
        </g>
        <path d="M38 168 V146 A30 30 0 0 1 68 116 H88 L100 128 L112 116 H132 A30 30 0 0 1 162 146 V168 A4 4 0 0 1 158 172 H42 A4 4 0 0 1 38 168 Z M52 172 V142 a1.75 1.75 0 0 1 3.5 0 V172 Z M144.5 172 V142 a1.75 1.75 0 0 1 3.5 0 V172 Z M38 157 H52 V160.5 H38 Z M148 157 H162 V160.5 H148 Z M65 172 A17 17 0 0 1 88 153 A19 19 0 0 1 116 152 A16 16 0 0 1 137 172 Z" />
        <path d="M70 172 A13 13 0 0 1 90 158 A15 15 0 0 1 114 157 A12 12 0 0 1 132 172 Z" />
        <path d="M32 176 H168 a3 3 0 0 1 3 3 V181 a3 3 0 0 1 -3 3 H32 a3 3 0 0 1 -3 -3 V179 a3 3 0 0 1 3 -3 Z" />
        <path d="M36 188 H164 A64 30 0 0 1 36 188 Z M100 192 Q101.6 200.4 110 202 Q101.6 203.6 100 212 Q98.4 203.6 90 202 Q98.4 200.4 100 192 Z" />
        <path d="M154 40 Q156 54 170 56 Q156 58 154 72 Q152 58 138 56 Q152 54 154 40 Z" />
        <path d="M166 80 Q167 87 174 88 Q167 89 166 96 Q165 89 158 88 Q165 87 166 80 Z" />
      </g>
    </svg>
  );
}
