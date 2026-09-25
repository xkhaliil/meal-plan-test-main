"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthField from "@/app/components/auth/AuthField";
import AuthShell from "@/app/components/auth/AuthShell";
import Reveal from "@/app/components/motion/Reveal";
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
  const [busy, setBusy] = useState(false);
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

    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, name }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    // Writes storage, fills the store and notifies other tabs in one call.
    useAuthStore.getState().signIn(data.user, data.token);
    router.push("/recipes");
  }

  return (
    <AuthShell
      eyebrow="Create an account"
      statement="Decide what's for dinner once a week."
      blurb="Free to start, no card required. Bring your recipes, build the week around them, and let the shopping list write itself."
      points={[
        "Keep every recipe in one searchable catalog",
        "Plan seven days across breakfast, lunch and dinner",
        "Five Recipe Bot messages a day on the free plan",
      ]}
    >
      <Reveal y={18}>
        <p
          data-reveal-item
          className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-brown/50"
        >
          Get started
          <span className="h-px w-12 bg-brown/25" aria-hidden />
        </p>

        <h1
          data-reveal-item
          className="mt-4 font-display text-[clamp(2rem,6.5vw,3rem)] uppercase leading-[0.95] text-brown"
        >
          Create your account
        </h1>

        <p
          data-reveal-item
          className="mt-3 text-[0.95rem] leading-relaxed text-brown/70"
        >
          Free to start — no card required.
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
            className="btn btn-primary group h-14 w-full text-[0.9rem] uppercase tracking-[0.15em]"
          >
            {busy ? "Creating account…" : "Create account"}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </form>

        <p
          data-reveal-item
          className="mt-7 border-t-2 border-brown/15 pt-6 text-sm text-brown/70"
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-red underline decoration-2 underline-offset-4 transition-colors hover:text-brown"
          >
            Sign in
          </Link>
        </p>
      </Reveal>
    </AuthShell>
  );
}

/** Four pips and a word — the same pip idiom the chat page uses for quota. */
function StrengthMeter({ password }: { password: string }) {
  const score = strengthOf(password);
  const fill =
    score >= 4 ? "bg-green" : score >= 2 ? "bg-brown" : "bg-red border-red";

  return (
    <div className="mt-3 flex items-center gap-3 px-1.5">
      <span className="flex flex-1 gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-pill border border-brown/35",
              i < score ? fill : "bg-transparent"
            )}
          />
        ))}
      </span>

      <span className="text-[0.6rem] uppercase tracking-[0.15em] text-brown/60">
        {STRENGTH_LABELS[score]}
      </span>
      <span className="sr-only" aria-live="polite">
        Password strength: {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}
