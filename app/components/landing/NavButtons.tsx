import Link from "next/link";
import { ArrowRight, BookOpen, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The landing navbars' two buttons. The hero's header and the floating bar
 * share them, so the way in looks the same wherever it is met: pills in the
 * app's zinc, sentence case, a 1px lift and a deeper shadow on hover, and a
 * focus ring for the keyboard.
 */

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const PRESS =
  "transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/**
 * The way in: a dark pill whose white chip passes one arrow out and the next
 * in on hover. `compact` keeps it smaller on a phone, where it shares the
 * hero's header with the mark.
 */
export function PrimaryNavButton({
  href,
  label,
  phoneLabel,
  compact = false,
}: {
  href: string;
  label: string;
  /** A shorter label for a phone, where space is tight. */
  phoneLabel?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/cta inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-900 font-medium text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(24,24,27,0.2),0_8px_20px_-10px_rgba(24,24,27,0.55)]",
        "hover:bg-zinc-800 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(24,24,27,0.18),0_14px_28px_-12px_rgba(24,24,27,0.6)]",
        PRESS,
        FOCUS,
        compact
          ? "h-10 gap-1.5 pl-3.5 pr-1.5 text-[13px] sm:h-11 sm:gap-2.5 sm:pl-5 sm:text-sm"
          : "h-11 gap-2.5 pl-5 pr-1.5 text-sm"
      )}
    >
      {phoneLabel ? (
        <>
          <span className="sm:hidden">{phoneLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-zinc-900",
          compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8"
        )}
      >
        <ArrowRight
          strokeWidth={2.25}
          className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover/cta:translate-x-[180%] motion-reduce:transition-none"
        />
        <ArrowRight
          strokeWidth={2.25}
          className="absolute h-3.5 w-3.5 -translate-x-[180%] transition-transform duration-300 ease-out group-hover/cta:translate-x-0 motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}

/**
 * The other way in — the visitor's recipes, or signing in. `glass` is a
 * frosted pill for the hero's wash; `ghost` has no edge of its own, for
 * inside the floating bar.
 */
export function SecondaryNavButton({
  href,
  label,
  icon,
  variant,
  className,
}: {
  href: string;
  label: string;
  icon: "recipes" | "account";
  variant: "glass" | "ghost";
  className?: string;
}) {
  const Icon = icon === "recipes" ? BookOpen : CircleUserRound;
  return (
    <Link
      href={href}
      className={cn(
        "group/sec inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full font-medium text-zinc-900",
        PRESS,
        FOCUS,
        variant === "glass"
          ? "h-10 border border-zinc-900/10 bg-white/70 px-3.5 text-[13px] shadow-[0_1px_2px_rgba(24,24,27,0.05)] hover:border-zinc-900/15 hover:bg-white hover:shadow-[0_8px_20px_-10px_rgba(24,24,27,0.3)] sm:h-11 sm:px-5 sm:text-sm"
          : "h-11 px-4 text-sm text-zinc-600 hover:bg-zinc-900/[0.05] hover:text-zinc-900",
        className
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className={cn(
          "h-4 w-4 text-zinc-500 transition-colors duration-300 group-hover/sec:text-zinc-900",
          // The hero's version drops its icon on a phone, to leave the mark room.
          variant === "glass" && "hidden sm:block"
        )}
      />
      {label}
    </Link>
  );
}
