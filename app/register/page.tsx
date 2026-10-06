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
import { cn } from "@/lib/utils";

/** What the register route enforces (`app/api/auth/register/route.ts`). */
const MIN_PASSWORD = 8;

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

/** 0–4, from length and variety. Advice only — the server rule is the length. */
function strengthOf(password: string) {
  let score = 0;
  if (password.length >= MIN_PASSWORD) score += 1;
  if (password.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  return score;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  /** Same three phases as sign-in, for the same reason — see app/login. */
  const [phase, setPhase] = useState<"idle" | "sending" | "created">("idle");
  const busy = phase !== "idle";
  const router = useRouter();

  // Derived rather than mirrored into state — the lint rule flags setState in
  // an effect, and there is nothing here an effect would buy.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Fill in your name, email and a password.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError("Password must be at least " + MIN_PASSWORD + " characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPhase("sending");

    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name }),
      });
    } catch {
      setPhase("idle");
      setError(NETWORK_ERROR_MESSAGE);
      return;
    }

    if (!res.ok) {
      setPhase("idle");
      setError(
        await messageForFailedResponse(
          res,
          "We couldn't create your account. Check the details and try again."
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
    setPhase("created");
    router.push("/recipes");
  }

  return (
    <AuthShell
      points={["Free to start", "No card required", "Cancel Pro anytime"]}
    >
      <Reveal y={14}>
        <div data-reveal-item className="text-center">
          <h1 className="text-[40px] leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
            Create your account
          </h1>
          <p className="mt-3 text-[15px] text-zinc-500">
            Decide what&apos;s for dinner once a week.
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

          {phase === "created" && (
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
              Account created — setting up your kitchen…
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthField
              label="Full name"
              autoComplete="name"
              value={name}
              onChange={setName}
              placeholder="Alice Johnson"
              required
            />

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
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              invalid={tooShort}
              // Once it clears the rule the meter says everything; repeating
              // the rule under a valid password is just noise.
              hint={
                tooShort
                  ? "A few more — " + MIN_PASSWORD + " characters minimum."
                  : password.length === 0
                    ? "At least " + MIN_PASSWORD + " characters."
                    : undefined
              }
              footer={
                password.length > 0 && <StrengthMeter password={password} />
              }
            />

            <AuthField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              required
              invalid={mismatch}
              hint={
                mismatch
                  ? "Those two don't match yet."
                  : confirmPassword.length > 0
                    ? "Passwords match."
                    : undefined
              }
            />

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary group !mt-6 h-11 w-full"
            >
              {phase === "sending"
                ? "Creating account…"
                : phase === "created"
                  ? "One moment…"
                  : "Create account"}
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          </form>
        </div>

        <p data-reveal-item className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-900"
          >
            Sign in
          </Link>
        </p>
      </Reveal>
    </AuthShell>
  );
}

/** Four bars and a word. */
function StrengthMeter({ password }: { password: string }) {
  const score = strengthOf(password);
  const fill =
    score >= 4 ? "bg-emerald-500" : score >= 2 ? "bg-zinc-900" : "bg-red-500";

  return (
    <div className="mt-2.5 flex items-center gap-3">
      <span className="flex flex-1 gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < score ? fill : "bg-zinc-100"
            )}
          />
        ))}
      </span>

      <span className="text-xs text-zinc-500">{STRENGTH_LABELS[score]}</span>
      <span className="sr-only" aria-live="polite">
        Password strength: {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}
