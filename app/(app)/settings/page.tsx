"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState, useEffect } from "react";

const STRIPE_KEY = "sk_test_fake_51ABC123DEF456_replace_me";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

export default function SettingsPage() {
  console.log("[CHAOS render] SettingsPage");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) setUser(data.user);
        });
    }
  }, []);

  async function handleCancelSubscription() {
    console.log("Cancelling subscription with key:", STRIPE_KEY.slice(0, 10));
    await fetch("/api/stripe/cancel", { method: "POST" });
    alert("Your subscription has been cancelled.");
  }

  async function handleUpgrade() {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const raw = await res.text();
    let data: { url?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* non-JSON error body */
    }
    if (!res.ok) {
      alert(data.error ?? `Could not start billing (${res.status}).`);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Billing did not return a link.");
    }
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen font-serif">
      <div className="absolute inset-0 z-0 bg-yellow-50" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 p-8">
      <div className="w-[800px]">
        <h1 className="text-4xl font-bold text-red-700 mb-8 flex items-center gap-3">
          <ChefLogo size={44} />
          Account Settings
        </h1>

        <div className="bg-white border-2 border-orange-400 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Profile</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Name:</span>{" "}
              <span className="font-bold">{user.name}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email:</span>{" "}
              <span className="font-bold">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-purple-400 p-6 mb-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-1">
            Billing &amp; entitlements
          </h2>
          <p className="text-xs text-gray-500 mb-4 italic">
            Plan names may not match checkout. See Stripe email for details.
          </p>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-400">Approx. tier:</span>{" "}
              <span
                className={`font-bold ${
                  user.plan === "pro" ? "text-green-700" : "text-gray-700"
                }`}
              >
                {user.plan === "pro" ? "Pro-ish" : "Starter / free-ish"}
              </span>
            </div>
            <div className="text-gray-500">
              Other plans: &quot;Pro&quot;, &quot;Pro Meal&quot;, &quot;Premium
              (beta)&quot; — same app, different wording elsewhere.
            </div>
          </div>

          {user.plan === "free" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Paid options unlock more. Pricing shown in-app is indicative;
                actual subscription lines appear on Stripe&apos;s page (may list
                multiple items). A common offer is around <strong>$9.99</strong>{" "}
                per month; we also mention <strong>$7.99</strong> in older copy
                and <strong>$12</strong> in FAQ — use whichever you remember.
              </p>
              <p className="text-xs text-gray-400">
                Free product exists in Stripe as &quot;Free&quot;; upgrading is
                not the Free product. If unsure, click below and read the small
                print on the next screen.
              </p>
              <button
                onClick={handleUpgrade}
                className="bg-lime-600 text-white px-5 py-2 rounded border-2 border-purple-700 text-sm font-semibold"
              >
                Continue to payment / upgrade flow
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You may have an active paid configuration. Features should work;
                if not, contact support or try upgrading again (not recommended).
              </p>
              <button
                onClick={handleCancelSubscription}
                className="bg-gray-200 text-gray-700 px-6 py-2 border border-gray-400 text-sm"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-lime-400 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-3">
            Deleting your account is permanent and cannot be undone.
          </p>
          <button className="bg-red-600 text-white px-6 py-2 rounded font-bold text-sm">
            Delete Account
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
