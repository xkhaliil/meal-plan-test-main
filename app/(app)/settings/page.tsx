"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

const PRO_FEATURES = [
  "Unlimited Recipe Bot messages",
  "AI-generated photos for every recipe",
  "Unlimited meal plans",
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [busy, setBusy] = useState(false);

  // Read the plan from the API rather than the cached localStorage copy, which
  // goes stale as soon as a subscription changes.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function handleCancelSubscription() {
    setCancelError("");
    setBusy(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setCancelError(data.error || `Could not cancel subscription (${res.status}).`);
      return;
    }

    setUser((prev) => (prev ? { ...prev, plan: "free" } : prev));
  }

  async function handleUpgrade() {
    setBusy(true);
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
    setBusy(false);

    if (!res.ok) {
      setCancelError(data.error ?? `Could not start checkout (${res.status}).`);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setCancelError("Billing did not return a checkout link.");
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-brown/15" />
        <div className="mt-8 h-32 w-full animate-pulse rounded-card bg-brown/15" />
      </div>
    );
  }

  const isPro = user.plan === "pro";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl uppercase text-brown">Settings</h1>
      <p className="mt-1 text-sm text-brown/70">Manage your account and plan.</p>

      <section className="card mt-8 p-6">
        <h2 className="text-lg uppercase text-brown">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-brown/70">Name</dt>
            <dd className="font-medium text-brown">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brown/70">Email</dt>
            <dd className="font-medium text-brown">{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="card mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg uppercase text-brown">Plan</h2>
            <p className="mt-1 text-sm text-brown/70">
              {isPro
                ? "You have full access to everything."
                : "You're on the free plan."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isPro
                ? "border-2 border-brown bg-green text-white"
                : "border-2 border-brown bg-yellow text-brown"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>
        </div>

        {cancelError && <div className="alert-error mt-4">{cancelError}</div>}

        {isPro ? (
          <div className="mt-6 border-t border-brown pt-5">
            <button
              onClick={handleCancelSubscription}
              disabled={busy}
              className="btn btn-secondary"
            >
              {busy ? "Working..." : "Cancel subscription"}
            </button>
            <p className="mt-2 text-xs text-brown/55">
              You&apos;ll move to the free plan and keep every recipe you&apos;ve saved.
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-brown pt-5">
            <ul className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-brown">
                  <span className="text-green" aria-hidden>
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={busy}
              className="btn btn-primary mt-5"
            >
              {busy ? "Starting checkout..." : "Upgrade to Pro"}
            </button>
            <p className="mt-2 text-xs text-brown/55">
              Billed monthly through Stripe. Cancel anytime.
            </p>
          </div>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg uppercase text-brown">Delete account</h2>
        <p className="mt-1 text-sm text-brown/70">
          Permanently removes your account, recipes, and meal plans. This cannot be
          undone.
        </p>
        <button className="btn btn-danger mt-4" disabled>
          Delete account
        </button>
        <p className="mt-2 text-xs text-brown/55">
          Not available yet — see NOTES.md for the planned implementation.
        </p>
      </section>
    </div>
  );
}
