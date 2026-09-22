import Image from "next/image";
import Link from "next/link";

const SRC = "/images/chef-logo.png";

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
      alt="Chef"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
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
