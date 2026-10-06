import Link from "next/link";
import ChefLogo from "@/app/components/ChefLogo";
import { cn } from "@/lib/utils";

/**
 * The logo lockup: mark plus name, set the way faceiqlabs.com sets its own —
 * a small icon and the name in the UI face, not a display font. Used by every
 * header and footer so they can't drift apart.
 */
export default function Wordmark({
  href = "/landing",
  className,
}: {
  /** `null` renders it without a link, for places that already link around it. */
  href?: string | null;
  className?: string;
}) {
  const content = (
    <>
      <ChefLogo size={28} />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
        MealPlan
      </span>
    </>
  );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
    >
      {content}
    </Link>
  );
}
