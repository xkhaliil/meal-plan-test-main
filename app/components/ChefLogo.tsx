import Image from "next/image";
import Link from "next/link";

const SRC = "/images/mealplan-logo.svg";

type ChefLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  href?: string | null;
};

export default function ChefLogo({
  size = 40,
  className = "",
  priority = false,
  href = "/landing",
}: ChefLogoProps) {
  const image = (
    <Image
      src={SRC}
      alt="MealPlan Pro"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
      // Vector: there is nothing for the optimizer to do, and routing an SVG
      // through it needs `dangerouslyAllowSVG` in next.config. Serving the file
      // as-is also keeps the animation inside it running.
      unoptimized
    />
  );

  if (href === null) {
    return image;
  }

  return (
    <Link href={href} className="inline-flex shrink-0">
      {image}
    </Link>
  );
}
