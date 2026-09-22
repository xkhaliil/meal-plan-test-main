"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  console.log("[CHAOS render] LoginPage");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    router.push("/recipes");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center font-serif">
      <div className="absolute inset-0 z-0 bg-purple-900" aria-hidden />
      <CookingGifBackdrop stackClass="z-[1]" />
      <div className="relative z-10 w-full p-4 flex justify-center">
      <div className="bg-white p-8 w-[450px]">
        <div className="flex items-center gap-3 mb-2">
          <ChefLogo size={48} priority />
          <h1 className="text-4xl font-bold text-orange-600">Chef</h1>
        </div>
        <h2 className="text-lg text-gray-500 mb-8">Sign in to your account</h2>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Email Address
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-300 p-3 text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-lime-500 text-black font-bold py-3 text-lg"
          >
            LOG IN
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-purple-600 underline">
            Register here
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}
