"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";

export default function CheckoutSuccessPage() {
  console.log("[CHAOS render] CheckoutSuccessPage");
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute inset-0 z-0 bg-green-50" aria-hidden />
      <CookingGifBackdrop stackClass="z-[1]" />
      <div className="relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <ChefLogo size={56} priority />
        </div>
        <h1 className="text-4xl font-bold text-green-700 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome to Pro! Your account has been upgraded.
        </p>
        <a
          href="/recipes"
          className="bg-green-600 text-white px-6 py-3 rounded font-bold"
        >
          Go to Recipes
        </a>
      </div>
    </div>
  );
}
