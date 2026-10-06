"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import RichText from "@/app/components/RichText";
import { requestJson } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "@/lib/stores/toastStore";
import { useState, useEffect, useRef } from "react";

interface CreatedRecipe {
  id: string;
  title: string;
  imageUrl?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  cuisine?: string | null;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  recipe?: CreatedRecipe | null;
  isError?: boolean;
}

interface Quota {
  plan: string;
  limit: number | null;
  used: number;
  remaining: number | null;
}

/** The persona the API's system prompt actually gives the model. */
const CHEF = "Chef Ferraro";

const SPECIALS = [
  "Give me a high-protein dinner recipe",
  "Something vegetarian I can make in 20 minutes",
  "A comforting soup for cold weather",
];

const GREETING =
  "Kitchen's open. Tell me what you're in the mood for — a craving, a constraint, whatever's left in the fridge — and I'll write the whole recipe and drop it in your catalog.";

/** Lets the composer grow to roughly four lines before it scrolls. */
const MAX_COMPOSER_HEIGHT = 160;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The server keeps the conversation and feeds it back to the model, so the
  // page has to show it — otherwise the bot remembers what you can't see.
  useEffect(() => {
    requestJson<{ messages?: Message[]; quota?: Quota }>(
      "/api/chat",
      { headers: useAuthStore.getState().authHeaders() },
      "Could not load your conversation."
    )
      .then((result) => {
        if (!result.ok) {
          // Silently swallowed before: the transcript just came up empty, as
          // if the chef had never been spoken to.
          toast.error(result.error);
          return;
        }
        setMessages(
          (result.data.messages ?? []).map((m: Message) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setQuota(result.data.quota ?? null);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  // Follow the conversation, but don't yank the view while you're reading back.
  useEffect(() => {
    if (!atBottom) return;
    const el = transcriptRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, atBottom]);

  function handleScroll() {
    const el = transcriptRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  function resizeComposer() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;

    setAtBottom(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    if (composerRef.current) composerRef.current.style.height = "";
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...useAuthStore.getState().authHeaders(),
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
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

      if (data.quota) {
        setQuota(data.quota);
      } else if (res.ok) {
        // Kept roughly right until the next load if the reply came from one of
        // the handler's earlier exits.
        setQuota((q) =>
          q && q.remaining !== null
            ? {
                ...q,
                used: q.used + 1,
                remaining: Math.max(0, q.remaining - 1),
              }
            : q
        );
      }
    } catch (err) {
      // A cancelled request isn't a failure; the user asked for it to stop.
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't reach the kitchen. Check your connection and try again.",
            isError: true,
          },
        ]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  /**
   * Archives the conversation server-side, so the chef forgets it too. Today's
   * quota is unaffected — the rows stay, they just leave the transcript.
   */
  async function startNewConversation() {
    setResetting(true);
    const result = await requestJson(
      "/api/chat",
      { method: "DELETE", headers: useAuthStore.getState().authHeaders() },
      "Could not clear the conversation."
    );
    setResetting(false);
    setConfirmingReset(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages([]);
    setAtBottom(true);
  }

  /** Drops the failed exchange and asks the same question again. */
  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || loading) return;

    setMessages((prev) => {
      const next = [...prev];
      // send() re-adds the question, so take both halves off first.
      if (next[next.length - 1]?.isError) next.pop();
      if (next[next.length - 1]?.role === "user") next.pop();
      return next;
    });
    send(lastUser.content);
  }

  const lastMessage = messages[messages.length - 1];
  const outOfMessages = quota?.remaining === 0;
  // Retrying a quota refusal just spends another round trip on the same answer.
  const canRetry = !loading && !outOfMessages && lastMessage?.isError === true;
  const showGreeting = !historyLoading && messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {/* ---------- The chef: a rail on desktop, a strip on mobile ---------- */}
      <aside
        data-lenis-prevent
        className="flex shrink-0 items-center gap-4 border-b border-zinc-100 bg-white px-5 py-4 lg:w-[340px] lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:py-9"
      >
        <Image
          src="/images/chef-badge.png"
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 shrink-0 rounded-full border border-zinc-200 bg-white object-contain p-1 lg:hidden"
        />

        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className="truncate text-[22px] tracking-tight lg:mt-2 lg:text-[40px]">
            {CHEF}
          </h1>
          <p className="mt-3 hidden text-sm leading-relaxed text-zinc-400 lg:block">
            Writes complete recipes, ingredients, timings, a photo and files
            them in your catalog.
          </p>
        </div>

        {/* Prompt starters, as a café menu. */}
        <div className="mt-8 hidden lg:block">
          <SpecialsMenu onPick={send} disabled={loading || outOfMessages} />
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setConfirmingReset(true)}
            className="btn btn-secondary ml-auto min-h-9 shrink-0 px-4 text-[13px] lg:ml-0 lg:mt-6 lg:w-full"
          >
            New conversation
          </button>
        )}

        <Link
          href="/recipes"
          className="mt-auto hidden pt-8 text-sm text-zinc-400 transition-colors hover:text-zinc-900 lg:block"
        >
          Your catalog →
        </Link>
      </aside>

      {/* ---------- Conversation ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div
            ref={transcriptRef}
            onScroll={handleScroll}
            data-lenis-prevent
            className="dot-grid absolute inset-0 overflow-y-auto px-5 py-8 sm:px-8"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-7">
              {historyLoading && <TranscriptSkeleton />}

              {showGreeting && (
                <>
                  <BotBubble name={CHEF}>
                    <p className="leading-relaxed">{GREETING}</p>
                  </BotBubble>
                  <div className="lg:hidden">
                    <SpecialsMenu
                      onPick={send}
                      disabled={loading || outOfMessages}
                    />
                  </div>
                </>
              )}

              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={msg.id ?? i} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-tr-md bg-zinc-900 px-5 py-3 text-[15px] leading-relaxed text-white">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <BotBubble
                    key={msg.id ?? i}
                    name={messages[i - 1]?.role === "assistant" ? null : CHEF}
                    error={msg.isError}
                    footer={
                      msg.recipe ? <OrderTicket recipe={msg.recipe} /> : null
                    }
                  >
                    <RichText content={msg.content} />
                    {msg.isError && msg.content.includes("Upgrade to Pro") && (
                      <Link
                        href="/settings"
                        className="mt-3 inline-block text-xs font-medium underline underline-offset-2"
                      >
                        Go to billing settings →
                      </Link>
                    )}
                  </BotBubble>
                )
              )}

              {loading && (
                <BotBubble name={null}>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                    </span>
                    <span className="text-xs uppercase tracking-[0.15em] text-zinc-400">
                      Cooking
                    </span>
                  </span>
                </BotBubble>
              )}

              {canRetry && (
                <div className="pl-[58px]">
                  <button
                    onClick={retry}
                    className="btn btn-secondary min-h-9 px-4 text-[13px]"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>

          {!atBottom && messages.length > 0 && (
            <button
              onClick={() => {
                const el = transcriptRef.current;
                el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                setAtBottom(true);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs uppercase tracking-wide text-zinc-900 shadow-[0_12px_32px_-16px_rgba(24,24,27,0.18)] transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              Latest ↓
            </button>
          )}
        </div>

        {/* ---------- Composer ---------- */}
        <div className="border-t border-zinc-100 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto max-w-2xl"
          >
            <div className="flex items-end gap-3">
              <textarea
                ref={composerRef}
                rows={1}
                value={input}
                disabled={outOfMessages}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeComposer();
                }}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter is a newline.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={
                  outOfMessages
                    ? "You've used today's messages"
                    : `Ask ${CHEF} for an idea...`
                }
                className="input min-h-12 flex-1 resize-none rounded-3xl px-5 py-3 disabled:opacity-60"
                aria-label={`Message ${CHEF}`}
              />

              {loading ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop generating"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 transition-colors hover:border-zinc-300"
                >
                  <span className="h-3 w-3 bg-current" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={outOfMessages || !input.trim()}
                  aria-label="Send message"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg text-white transition-colors enabled:hover:bg-zinc-700 disabled:opacity-25"
                >
                  →
                </button>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-zinc-400">
              <span className="hidden sm:inline">
                Enter to send · Shift+Enter for a new line
              </span>
              {outOfMessages && (
                <Link
                  href="/settings"
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        busy={resetting}
        title="Start a new conversation?"
        confirmLabel="Start fresh"
        cancelLabel="Keep it"
        body={
          <p>
            This clears the transcript and {CHEF} forgets what you&apos;ve
            discussed. Recipes already saved to your catalog stay, and it
            doesn&apos;t give back any of today&apos;s messages.
          </p>
        }
        onConfirm={startNewConversation}
        onCancel={() => {
          if (!resetting) setConfirmingReset(false);
        }}
      />
    </div>
  );
}

function BotBubble({
  name,
  error,
  footer,
  children,
}: {
  /** Shown above the bubble when this starts a run of chef messages. */
  name?: string | null;
  error?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <Image
        src="/images/chef-badge.png"
        alt=""
        width={44}
        height={44}
        className="mt-1 h-9 w-9 shrink-0 rounded-full border border-zinc-200 bg-white object-contain p-1"
      />
      <div className="min-w-0 max-w-[88%]">
        {name && (
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            {name}
          </p>
        )}
        <div
          className={
            error
              ? "alert-error rounded-3xl rounded-tl-md px-5 py-4"
              : "rounded-3xl rounded-tl-md border border-zinc-200 bg-white px-5 py-4 text-[15px] shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
          }
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

function StatusPill({ cooking }: { cooking: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-900">
      <span
        className={`h-2 w-2 rounded-full ${
          cooking ? "animate-pulse bg-zinc-900" : "bg-emerald-600"
        }`}
        aria-hidden
      />
      {cooking ? "Cooking" : "On duty"}
    </span>
  );
}

/** Today's allowance as pips — filled ones are still yours to spend. */
function QuotaMeter({ quota }: { quota: Quota | null }) {
  if (!quota) return null;

  if (quota.remaining === null || quota.limit === null) {
    return (
      <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
        Pro · unlimited
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: quota.limit }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full border border-zinc-200 ${
              i < quota.remaining! ? "bg-zinc-900" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span
        className={`text-[11px] uppercase tracking-[0.2em] ${
          quota.remaining === 0 ? "text-zinc-900" : "text-zinc-500"
        }`}
      >
        {quota.remaining} left today
      </span>
    </span>
  );
}

function SpecialsMenu({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_12px_32px_-16px_rgba(24,24,27,0.18)]">
      <p className="text-sm font-semibold text-zinc-900">
        Today&apos;s specials
      </p>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
        Pick one to start
      </p>

      <div className="mt-4 flex flex-col">
        {SPECIALS.map((special, i) => (
          <button
            key={special}
            onClick={() => onPick(special)}
            disabled={disabled}
            className="group flex items-baseline gap-2.5 border-t border-zinc-100 py-3 text-left disabled:opacity-40"
          >
            <span className="text-xs tabular-nums text-zinc-300">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-snug text-zinc-600 transition-colors group-hover:text-zinc-900">
              {special}
            </span>
            <span className="ml-auto shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-900">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The saved recipe, handed over like a kitchen ticket. */
function OrderTicket({ recipe }: { recipe: CreatedRecipe }) {
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const meta = [
    totalTime > 0 ? `${totalTime} min` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.cuisine,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative mt-5">
      <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white">
        Order up
      </span>

      <Link
        href={`/recipes/${recipe.id}`}
        className="group flex items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-3 pt-4 shadow-[0_12px_32px_-16px_rgba(24,24,27,0.18)] transition-colors hover:border-zinc-300"
      >
        {recipe.imageUrl && (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
            <Image
              src={recipe.imageUrl}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-zinc-900">
            {recipe.title}
          </span>
          <span className="mt-1 block text-xs text-zinc-400">
            {meta || "Saved to your catalog"}
          </span>
        </span>

        <span className="btn-circle h-9 w-9 shrink-0 text-sm transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white">
          →
        </span>
      </Link>
    </div>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-hidden>
      <div className="flex gap-3.5">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-24 w-full max-w-md animate-pulse rounded-3xl rounded-tl-none bg-zinc-100" />
      </div>
      <div className="flex justify-end">
        <div className="h-12 w-52 animate-pulse rounded-3xl rounded-tr-none bg-zinc-100" />
      </div>
    </div>
  );
}
