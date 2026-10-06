import Link from "next/link";
import AuthShell from "@/app/components/auth/AuthShell";

export default function CheckoutCancelPage() {
  return (
    <AuthShell back={{ href: "/recipes", label: "Go to the app" }}>
      <div className="text-center">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.03em]">
          Checkout cancelled
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">
          No charges were made. You&apos;re still on the free plan, with
          everything you had before.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/settings" className="btn btn-primary h-11 w-full">
          Back to settings
        </Link>
        <Link href="/recipes" className="btn btn-secondary h-11 w-full">
          Go to recipes
        </Link>
      </div>
    </AuthShell>
  );
}
