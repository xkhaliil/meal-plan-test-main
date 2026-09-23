import ChefLogo from "@/app/components/ChefLogo";
import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <ChefLogo size={36} href={null} priority />
        <div className="card mt-6 p-10">
          <h1 className="text-2xl uppercase text-brown">Checkout cancelled</h1>
          <p className="mt-2 text-sm text-brown/70">
            No charges were made. You&apos;re still on the free plan.
          </p>
          <div className="mt-7 flex flex-col gap-2">
            <Link href="/settings" className="btn btn-primary w-full">
              Back to settings
            </Link>
            <Link href="/recipes" className="btn btn-ghost w-full">
              Go to recipes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
