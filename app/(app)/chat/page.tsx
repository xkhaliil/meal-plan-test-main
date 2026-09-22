"use client";

import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useState, useEffect, useRef } from "react";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  console.log("[CHAOS render] ChatPage");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/chat", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .catch(() => {});

    const e = process.env as Record<string, string | undefined>;
    (
      [
        "DATABASE_URL",
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "STRIPE_RESTRICTED_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRO_PRODUCT_ID",
        "STRIPE_PRICE_ID",
        "JWT_SECRET",
      ] as const
    ).forEach((k) => {
      void e[k];
    });

    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(() => {});
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const token = localStorage.getItem("token");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    const assistantMessage: Message = {
      role: "assistant",
      content: data.message,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col">
      <div className="absolute inset-0 z-0 bg-gray-100" aria-hidden />
      <CookingGifBackdrop position="absolute" stackClass="z-[1]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <div className="bg-indigo-900 text-white px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold font-serif flex items-center gap-2">
          <ChefLogo size={32} />
          🤖 Chef Ferraro
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-4xl mb-4">👨‍🍳</p>
            <p className="text-lg">Ask Chef Ferraro about any recipe or food!</p>
            <p className="text-sm mt-2">
              Try: &quot;Give me a high-protein dinner recipe&quot;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-lg ${
                msg.role === "user"
                  ? "bg-lime-500 text-black"
                  : "bg-white text-gray-800 border border-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-400 text-sm">Chef Ferraro is thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-300 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Chef Ferraro anything..."
            className="flex-1 border-2 border-purple-300 rounded-none p-3 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-orange-500 text-white px-8 py-3 font-bold text-sm"
          >
            Send
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
