"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface CreatedRecipe {
  id: string;
  title: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  recipe?: CreatedRecipe | null;
  isError?: boolean;
}

const SUGGESTIONS = [
  "Give me a high-protein dinner recipe",
  "Something vegetarian I can make in 20 minutes",
  "A comforting soup for cold weather",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    const token = localStorage.getItem("token");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json().catch(() => ({}));

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: res.ok
          ? data.message
          : data.error || "Something went wrong. Please try again.",
        recipe: res.ok ? data.recipe : null,
        isError: !res.ok,
      },
    ]);
    setLoading(false);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-6">
      <div className="border-b border-brown py-6">
        <h1 className="text-2xl uppercase text-brown">Recipe Bot</h1>
        <p className="mt-1 text-sm text-brown/70">
          Describe what you feel like eating — anything it invents gets saved to your
          catalog.
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="pt-10 text-center">
            <p className="font-display text-xl text-brown">What are we cooking?</p>
            <p className="mt-2 text-sm text-brown/70">
              Try one of these to get started.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="btn btn-secondary w-full max-w-md justify-start text-left font-normal text-brown/70"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-card px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-red text-white"
                  : msg.isError
                    ? "border border-[#f0d4d1] bg-[#fdf2f1] text-[#93221b]"
                    : "border-2 border-brown bg-beige text-brown"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.isError && msg.content.includes("Upgrade to Pro") && (
                <Link
                  href="/settings"
                  className="mt-3 inline-block text-xs font-medium underline underline-offset-2"
                >
                  Go to billing settings →
                </Link>
              )}

              {msg.recipe && (
                <Link
                  href={`/recipes/${msg.recipe.id}`}
                  className="mt-3 flex items-center gap-2 rounded-lg border-2 border-brown bg-yellow px-3 py-2 text-xs font-medium text-red hover:bg-beige"
                >
                  View “{msg.recipe.title}” →
                </Link>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-card border-2 border-brown bg-beige px-4 py-3">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brown/40 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brown/40 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brown/40" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-brown py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask for a recipe idea..."
            className="input"
            aria-label="Message Recipe Bot"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-brown/55">
          Free plan includes 5 messages per day.
        </p>
      </div>
    </div>
  );
}
