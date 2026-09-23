"use client";

import ChefLogo from "@/app/components/ChefLogo";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    router.push("/recipes");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/landing" className="flex items-center justify-center gap-2.5">
          <ChefLogo size={32} href={null} priority />
          <span className="font-display text-xl font-semibold text-brown">
            MealPlan Pro
          </span>
        </Link>

        <div className="card mt-8 p-8">
          <h1 className="text-2xl uppercase text-brown">Welcome back</h1>
          <p className="mt-1 text-sm text-brown/70">Sign in to your kitchen.</p>

          {error && <div className="alert-error mt-5">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-brown/70">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-red hover:text-red"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
