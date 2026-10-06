"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthField from "@/app/components/auth/AuthField";
import AuthShell from "@/app/components/auth/AuthShell";
import Reveal from "@/app/components/motion/Reveal";
import {
  NETWORK_ERROR_MESSAGE,
  UNREADABLE_RESPONSE_MESSAGE,
  messageForFailedResponse,
} from "@/lib/apiMessage";
import { useAuthStore } from "@/lib/stores/authStore";

/** Documented in TEST_INSTRUCTIONS.md — seeded on every `prisma db seed`. */
const DEMO = { email: "bob@example.com", password: "bob2024" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  /**
   * `signedIn` is its own phase rather than "not busy": the redirect is a
   * server round trip through the proxy, and on a cold function that is a
   * couple of seconds. Dropping straight back to an idle button made a
   * successful sign-in look like nothing had happened at all.
   */
  const [phase, setPhase] = useState<"idle" | "sending" | "signedIn">("idle");
  const busy = phase !== "idle";
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setPhase("sending");

    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Trimmed: a pasted address often carries a trailing space, and the
        // lookup is exact.
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch {
      // Without this the rejection escaped the handler: the button stayed on
      // "Signing in…" for ever and the reader was told nothing.
      setPhase("idle");
      setError(NETWORK_ERROR_MESSAGE);
      return;
    }

    if (!res.ok) {
      setPhase("idle");
      setError(
        await messageForFailedResponse(
          res,
          "We couldn't sign you in. Check your email and password."
        )
      );
      return;
    }

    const data = await res.json().catch(() => null);
    if (!data?.token || !data?.user) {
      setPhase("idle");
      setError(UNREADABLE_RESPONSE_MESSAGE);
      return;
    }

    // Writes storage, fills the store and notifies other tabs in one call.
    useAuthStore.getState().signIn(data.user, data.token);

    // Read from the URL directly: useSearchParams would force this page into
    // client-side rendering unless it were wrapped in a Suspense boundary.
    const next = new URLSearchParams(window.location.search).get("next");
    const destination = next && next.startsWith("/") ? next : "/recipes";

    // Say so before navigating, and stay disabled until the new page replaces
    // this one.
    setPhase("signedIn");
    router.push(destination);
  }

  return (
    <AuthShell
      points={["Free to start", "No card required", "Cancel Pro anytime"]}
    >
      <Reveal y={14}>
        <div data-reveal-item className="text-center">
          <h1 className="text-[40px] leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
            Welcome back
          </h1>
          <p className="mt-3 text-[15px] text-zinc-500">
            Sign in to your kitchen.
          </p>
        </div>

        <div data-reveal-item className="card mt-8 p-6 sm:p-8">
          {/* Mounted after the reveal has run; deliberately not marked for it,
              or it would arrive at opacity 0 and stay there. */}
          {error && (
            <div
              role="alert"
              className="alert-error mb-5 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              {error}
            </div>
          )}

          {phase === "signedIn" && (
            <div
              role="status"
              className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                aria-hidden
              >
                ✓
              </span>
              Signed in — opening your kitchen…
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              className="btn btn-primary group !mt-6 h-11 w-full"
            >
              {phase === "sending"
                ? "Signing in…"
                : phase === "signedIn"
                  ? "One moment…"
                  : "Sign in"}
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          </form>

          <div
            aria-hidden
            className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-300"
          >
            <span className="h-px flex-1 bg-zinc-100" />
            or
            <span className="h-px flex-1 bg-zinc-100" />
          </div>

          {/* The seeded accounts are in TEST_INSTRUCTIONS.md; filling one in is
              faster than copying it across. */}
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
              setError("");
            }}
            className="btn btn-secondary w-full"
          >
            Use the demo account
          </button>
          <p className="mt-2.5 text-center text-xs text-zinc-400">
            Fills in the seeded test account. Nothing is sent until you sign in.
          </p>
        </div>

        <p data-reveal-item className="mt-6 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-900"
          >
            Create an account
          </Link>
        </p>
      </Reveal>
    </AuthShell>
  );
}
