"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthField from "@/app/components/auth/AuthField";
import AuthShell from "@/app/components/auth/AuthShell";
import Reveal from "@/app/components/motion/Reveal";
import { useAuthStore } from "@/lib/stores/authStore";

/** Documented in TEST_INSTRUCTIONS.md — seeded on every `prisma db seed`. */
const DEMO = { email: "bob@example.com", password: "bob2024" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Trimmed: a pasted address often carries a trailing space, and the
      // lookup is exact.
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    // Writes storage, fills the store and notifies other tabs in one call.
    useAuthStore.getState().signIn(data.user, data.token);
    // Read from the URL directly: useSearchParams would force this page into
    // client-side rendering unless it were wrapped in a Suspense boundary.
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") ? next : "/recipes");
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      statement="Your kitchen, right where you left it."
      blurb="Sign in and pick up the week you were planning — the catalog, the plans and the shopping lists are all still there."
      points={[
        "Every recipe you've saved, searchable by cuisine, tag or time",
        "A seven-day plan you can fill in one sitting",
        "The Recipe Bot for the nights nothing comes to mind",
      ]}
    >
      <Reveal y={18}>
        <p
          data-reveal-item
          className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-brown/50"
        >
          Sign in
          <span className="h-px w-12 bg-brown/25" aria-hidden />
        </p>

        <h1
          data-reveal-item
          className="mt-4 font-display text-[clamp(2.25rem,7vw,3.25rem)] uppercase leading-[0.95] text-brown"
        >
          Welcome back
        </h1>

        <p
          data-reveal-item
          className="mt-3 text-[0.95rem] leading-relaxed text-brown/70"
        >
          Sign in to your kitchen.
        </p>

        {/* No data-reveal-item here: this mounts after the reveal has run, and
            anything marked for it that arrives late stays at opacity 0. */}
        {error && (
          <div
            role="alert"
            className="alert-error mt-6 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {error}
          </div>
        )}

        <form
          data-reveal-item
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 space-y-5"
        >
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />

          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary group h-14 w-full text-[0.9rem] uppercase tracking-[0.15em]"
          >
            {busy ? "Signing in…" : "Sign in"}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </form>

        {/* The seeded accounts are in TEST_INSTRUCTIONS.md; filling one in is
            faster than copying it across. */}
        <div
          data-reveal-item
          className="card mt-7 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.25em] text-brown/50">
              Just looking?
            </p>
            <p className="mt-1 text-sm text-brown/75">
              Use the seeded demo account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
              setError("");
            }}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-pill border-2 border-brown px-5 text-[0.7rem] uppercase tracking-[0.15em] text-brown transition-colors hover:bg-brown hover:text-yellow"
          >
            Fill it in
          </button>
        </div>

        <p
          data-reveal-item
          className="mt-7 border-t-2 border-brown/15 pt-6 text-sm text-brown/70"
        >
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-red underline decoration-2 underline-offset-4 transition-colors hover:text-brown"
          >
            Create an account
          </Link>
        </p>
      </Reveal>
    </AuthShell>
  );
}
