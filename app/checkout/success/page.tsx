import ChefLogo from "@/app/components/ChefLogo";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <ChefLogo size={36} href={null} priority />
        <div className="card mt-6 p-10">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green/20 text-xl text-green"
            aria-hidden
          >
            ✓
          </span>
          <h1 className="mt-5 text-2xl uppercase text-brown">
            You&apos;re on Pro
          </h1>
          <p className="mt-2 text-sm text-brown/70">
            Unlimited Recipe Bot access is active on your account.
          </p>
          <Link href="/recipes" className="btn btn-primary mt-7 w-full">
            Back to your recipes
          </Link>
        </div>
      </div>
    </div>
  );
}
