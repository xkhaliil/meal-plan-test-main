"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";

export default function CheckoutCancelPage() {
  console.log("[CHAOS render] CheckoutCancelPage");
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="absolute inset-0 z-0 bg-red-50" aria-hidden />
      <CookingGifBackdrop stackClass="z-[1]" />
      <div className="relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <ChefLogo size={48} priority />
        </div>
        <h1 className="text-3xl font-bold text-red-700 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your checkout was cancelled. No charges were made.
        </p>
        <a
          href="/settings"
          className="bg-red-600 text-white px-6 py-3 rounded font-bold"
        >
          Back to Settings
        </a>
      </div>
    </div>
  );
}
