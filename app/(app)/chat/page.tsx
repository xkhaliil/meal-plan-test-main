"use client";

import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import CookIllustration from "@/app/components/CookIllustration";
import RichText from "@/app/components/RichText";
import { useAuthStore } from "@/lib/stores/authStore";
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
    fetch("/api/chat", { headers: useAuthStore.getState().authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setMessages(
          (data.messages ?? []).map((m: Message) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setQuota(data.quota ?? null);
      })
      .catch(() => {})
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
    const res = await fetch("/api/chat", {
      method: "DELETE",
      headers: useAuthStore.getState().authHeaders(),
    }).catch(() => null);
    setResetting(false);
    setConfirmingReset(false);

    if (!res?.ok) return;
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
        className="flex shrink-0 items-center gap-4 border-b-2 border-brown bg-yellow px-5 py-4 lg:w-[360px] lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-y-auto lg:border-b-0 lg:border-r-2 lg:px-6 lg:py-9"
      >
        <Image
          src="/images/chef-badge.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full border-2 border-brown bg-beige object-contain p-1 lg:hidden"
        />

        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className=" font-display text-xl uppercase leading-none text-brown lg:mt-2 lg:text-[40px]">
            {CHEF}
          </h1>
          <p className="mt-3 hidden text-sm leading-relaxed text-brown/70 lg:block">
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
            className="tag ml-auto h-9 shrink-0 px-4 transition-colors hover:bg-brown hover:text-yellow lg:ml-0 lg:mt-6 lg:w-full lg:justify-center"
          >
            New conversation
          </button>
        )}

        <Link
          href="/recipes"
          className="mt-auto hidden pt-8 text-xs uppercase tracking-[0.15em] text-brown/55 transition-colors hover:text-red lg:block"
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
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-card rounded-tr-none border-2 border-brown bg-red px-5 py-3.5 leading-relaxed text-white">
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
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brown/40 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brown/40 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brown/40" />
                    </span>
                    <span className="text-xs uppercase tracking-[0.15em] text-brown/45">
                      Cooking
                    </span>
                  </span>
                </BotBubble>
              )}

              {canRetry && (
                <div className="pl-[58px]">
                  <button
                    onClick={retry}
                    className="rounded-pill border-2 border-brown bg-beige px-5 py-2 text-xs uppercase tracking-wide text-brown transition-colors hover:bg-brown hover:text-yellow"
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
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-pill border-2 border-brown bg-beige px-4 py-2 text-xs uppercase tracking-wide text-brown shadow-[3px_3px_0_0_#594b3c] transition-colors hover:bg-brown hover:text-yellow"
            >
              Latest ↓
            </button>
          )}
        </div>

        {/* ---------- Composer ---------- */}
        <div className="border-t-2 border-brown bg-yellow px-5 py-4 sm:px-8">
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
                className="input min-h-[52px] flex-1 resize-none py-3.5 disabled:opacity-60"
                aria-label={`Message ${CHEF}`}
              />

              {loading ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop generating"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-brown bg-beige text-brown transition-colors hover:bg-brown hover:text-yellow"
                >
                  <span className="h-3 w-3 bg-current" aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={outOfMessages || !input.trim()}
                  aria-label="Send message"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-brown bg-red text-xl text-white transition-colors hover:bg-brown hover:text-yellow disabled:opacity-35"
                >
                  →
                </button>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-[0.15em] text-brown/45">
              <span className="hidden sm:inline">
                Enter to send · Shift+Enter for a new line
              </span>
              {outOfMessages && (
                <Link
                  href="/settings"
                  className="text-red underline underline-offset-2"
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
        className="mt-1 h-11 w-11 shrink-0 rounded-full border-2 border-brown bg-beige object-contain p-1"
      />
      <div className="min-w-0 max-w-[88%]">
        {name && (
          <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-brown/50">
            {name}
          </p>
        )}
        <div
          className={
            error
              ? "alert-error rounded-tl-none"
              : "rounded-card rounded-tl-none border-2 border-brown bg-white px-5 py-4"
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
    <span className="inline-flex items-center gap-2 rounded-pill border-2 border-brown bg-beige px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-brown">
      <span
        className={`h-2 w-2 rounded-full ${
          cooking ? "animate-pulse bg-red" : "bg-green"
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
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-green">
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
            className={`h-2.5 w-2.5 rounded-full border-2 border-brown ${
              i < quota.remaining! ? "bg-red" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span
        className={`text-[0.6rem] uppercase tracking-[0.2em] ${
          quota.remaining === 0 ? "text-red" : "text-brown/55"
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
    <div className="rounded-card border-2 border-brown bg-beige p-5 shadow-[4px_4px_0_0_#594b3c]">
      <p className="font-display text-lg uppercase leading-none text-brown">
        Today&apos;s specials
      </p>
      <p className="mt-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-brown/45">
        Pick one to start
      </p>

      <div className="mt-4 flex flex-col">
        {SPECIALS.map((special, i) => (
          <button
            key={special}
            onClick={() => onPick(special)}
            disabled={disabled}
            className="group flex items-baseline gap-2.5 border-t-2 border-dotted border-brown/25 py-3 text-left disabled:opacity-40"
          >
            <span className="font-display text-xs text-red">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-snug text-brown transition-colors group-hover:text-red">
              {special}
            </span>
            <span className="ml-auto shrink-0 text-brown/35 transition-colors group-hover:text-red">
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
      <span className="absolute -top-2.5 left-4 z-10 rounded-pill border-2 border-brown bg-green px-3 py-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-white">
        Order up
      </span>

      <Link
        href={`/recipes/${recipe.id}`}
        className="group flex items-center gap-4 rounded-card border-2 border-brown bg-beige p-3 pt-4 shadow-[4px_4px_0_0_#594b3c] transition-colors hover:bg-white"
      >
        {recipe.imageUrl && (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card border-2 border-brown">
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
          <span className="block truncate font-display text-lg uppercase leading-tight text-brown transition-colors group-hover:text-red">
            {recipe.title}
          </span>
          <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.15em] text-brown/60">
            {meta || "Saved to your catalog"}
          </span>
        </span>

        <span className="btn-circle h-10 w-10 shrink-0 text-sm transition-colors group-hover:bg-brown group-hover:text-yellow">
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
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-brown/10" />
        <div className="h-24 w-full max-w-md animate-pulse rounded-card rounded-tl-none bg-brown/10" />
      </div>
      <div className="flex justify-end">
        <div className="h-12 w-52 animate-pulse rounded-card rounded-tr-none bg-brown/10" />
      </div>
    </div>
  );
}
