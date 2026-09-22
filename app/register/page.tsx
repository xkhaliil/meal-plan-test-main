"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  console.log("[CHAOS render] RegisterPage");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    router.push("/recipes");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center font-sans">
      <div className="absolute inset-0 z-0 bg-orange-100" aria-hidden />
      <CookingGifBackdrop stackClass="z-[1]" />
      <div className="relative z-10 w-full p-4 flex justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[400px]">
        <div className="flex items-center gap-3 mb-6">
          <ChefLogo size={40} priority />
          <h1 className="text-3xl font-bold text-red-600">Create Account</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 mb-4 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs uppercase text-gray-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs uppercase text-gray-600 mb-1">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-[80%] border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs uppercase text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs uppercase text-gray-600 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-[90%] border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-red-500 text-white font-bold py-3 rounded-full text-sm"
          >
            SIGN UP
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-orange-500 font-bold">
            Log in
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}
