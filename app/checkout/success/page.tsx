"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthShell from "@/app/components/auth/AuthShell";
import Reveal from "@/app/components/motion/Reveal";
import { useAuthStore } from "@/lib/stores/authStore";

type Receipt = {
  status: string;
  paid: boolean;
  plan: string;
  amountTotal: number | null;
  currency: string;
  interval: string | null;
  renewsAt: string | null;
  email: string | null;
};

type Phase = "checking" | "pro" | "pending" | "unpaid" | "error";

/** Stripe can be slower than the redirect; give the webhook a few seconds. */
const MAX_POLLS = 4;
const POLL_MS = 2000;

export default function CheckoutSuccessPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const polls = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      // Straight from the URL: useSearchParams would push this page into
      // client-side rendering unless it were wrapped in a Suspense boundary.
      // Read here rather than in the effect body — the server render has no
      // location, so the answer can only be known once, after mount.
      const sessionId = new URLSearchParams(window.location.search).get(
        "session_id"
      );

      if (!sessionId) {
        setPhase("error");
        setError(
          "This page needs the checkout session it came back from. Open Settings to see your current plan."
        );
        return;
      }

      const res = await fetch(
        "/api/stripe/session?session_id=" + encodeURIComponent(sessionId),
        { headers: useAuthStore.getState().authHeaders() }
      ).catch(() => null);

      if (cancelled) return;

      if (!res || !res.ok) {
        const data = res ? await res.json().catch(() => ({})) : {};
        setPhase("error");
        setError(
          data.error || "We couldn't reach Stripe to confirm that payment."
        );
        return;
      }

      const data: Receipt = await res.json();
      if (cancelled) return;
      setReceipt(data);

      if (data.plan === "pro") {
        setPhase("pro");
        // Keeps the navbar, settings and plan gates in step without a reload.
        useAuthStore.getState().patchUser({ plan: "pro" });
        return;
      }

      if (!data.paid) {
        setPhase("unpaid");
        return;
      }

      // Paid, but the account hasn't flipped: wait for the webhook.
      if (polls.current < MAX_POLLS) {
        polls.current += 1;
        timer = setTimeout(check, POLL_MS);
        return;
      }
      setPhase("pending");
    }

    check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <AuthShell
      points={
        phase === "pro"
          ? ["Unlimited Recipe Bot", "AI recipe photos", "Cancel anytime"]
          : undefined
      }
      back={{ href: "/recipes", label: "Go to the app" }}
    >
      <Reveal y={18} deps={[phase]}>
        {phase === "checking" && <Checking />}
        {phase === "pro" && <Confirmed receipt={receipt} />}
        {phase === "pending" && <Pending />}
        {phase === "unpaid" && <Unpaid />}
        {phase === "error" && <Failed message={error} />}
      </Reveal>
    </AuthShell>
  );
}

/* ---------------------------------------------------------------- states */

function Checking() {
  return (
    <div data-reveal-item aria-live="polite">
      <p className="eyebrow text-center">Confirming</p>
      <h1 className="mt-4 text-center text-[40px] leading-[1.05] tracking-[-0.03em]">
        Checking with Stripe
      </h1>
      <p className="mt-3 text-center text-[15px] leading-relaxed text-zinc-500">
        One moment — we&apos;re confirming the payment before we say anything we
        can&apos;t back up.
      </p>

      <span className="mt-8 flex justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-pulse rounded-full bg-zinc-300"
            style={{ animationDelay: i * 0.18 + "s" }}
          />
        ))}
      </span>
    </div>
  );
}

function Confirmed({ receipt }: { receipt: Receipt | null }) {
  return (
    <div>
      <p data-reveal-item className="eyebrow text-center">
        Subscription active
      </p>

      <h1
        data-reveal-item
        className="mt-4 flex flex-col items-center gap-5 text-center text-[40px] leading-[1.05] tracking-[-0.03em]"
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 font-sans text-xl text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.6)]"
          aria-hidden
        >
          ✓
        </span>
        You&apos;re on Pro
      </h1>

      <p
        data-reveal-item
        className="mt-3 text-center text-[15px] leading-relaxed text-zinc-500"
      >
        The cap is off. Ask the Recipe Bot as much as you like, and every recipe
        you save gets a photo.
      </p>

      {receipt && <ReceiptCard receipt={receipt} />}

      <div data-reveal-item className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/chat" className="btn btn-primary group h-11 w-full">
          Open Recipe Bot
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
        <Link href="/meal-plans" className="btn btn-secondary h-11 w-full">
          Plan this week
        </Link>
      </div>

      <p data-reveal-item className="mt-6 text-center text-sm text-zinc-500">
        Manage or cancel any time in{" "}
        <Link
          href="/settings"
          className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-900"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  );
}

function Pending() {
  return (
    <div>
      <p data-reveal-item className="eyebrow text-center">
        Payment received
      </p>
      <h1
        data-reveal-item
        className="mt-4 text-center text-[40px] leading-[1.05] tracking-[-0.03em]"
      >
        Almost there
      </h1>
      <p
        data-reveal-item
        className="mt-3 text-center text-[15px] leading-relaxed text-zinc-500"
      >
        Stripe has your payment, but your account hasn&apos;t switched over yet.
        It usually takes a few seconds. Nothing is lost — reload this page, or
        check Settings in a minute.
      </p>

      <div data-reveal-item className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-secondary h-11 w-full"
        >
          Check again
        </button>
        <Link href="/settings" className="btn btn-primary h-11 w-full">
          Open settings
        </Link>
      </div>
    </div>
  );
}

function Unpaid() {
  return (
    <div>
      <p data-reveal-item className="eyebrow text-center">
        Not completed
      </p>
      <h1
        data-reveal-item
        className="mt-4 text-center text-[40px] leading-[1.05] tracking-[-0.03em]"
      >
        No payment was taken
      </h1>
      <p
        data-reveal-item
        className="mt-3 text-center text-[15px] leading-relaxed text-zinc-500"
      >
        That checkout was never completed, so you haven&apos;t been charged and
        your plan is unchanged. You can start again whenever you want.
      </p>

      <div data-reveal-item className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/settings" className="btn btn-primary h-11 w-full">
          Try again
        </Link>
        <Link href="/recipes" className="btn btn-secondary h-11 w-full">
          Back to recipes
        </Link>
      </div>
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div>
      <p data-reveal-item className="eyebrow text-center">
        Couldn&apos;t confirm
      </p>
      <h1
        data-reveal-item
        className="mt-4 text-center text-[40px] leading-[1.05] tracking-[-0.03em]"
      >
        We can&apos;t confirm this one
      </h1>

      <div data-reveal-item role="alert" className="alert-error mt-6">
        {message}
      </div>

      <p
        data-reveal-item
        className="mt-3 text-center text-[15px] leading-relaxed text-zinc-500"
      >
        If you were charged, nothing is lost — Settings always shows the plan
        your account is actually on.
      </p>

      <div data-reveal-item className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/settings" className="btn btn-primary h-11 w-full">
          Open settings
        </Link>
        <Link href="/recipes" className="btn btn-secondary h-11 w-full">
          Back to recipes
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- receipt */

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const rows: Array<[string, string]> = [
    [
      "Plan",
      "Pro" + (receipt.interval ? " · " + billedEvery(receipt.interval) : ""),
    ],
  ];

  if (receipt.amountTotal != null) {
    rows.push(["Charged", formatMoney(receipt.amountTotal, receipt.currency)]);
  }
  if (receipt.email) rows.push(["Billed to", receipt.email]);
  if (receipt.renewsAt) rows.push(["Renews", formatDate(receipt.renewsAt)]);

  return (
    <dl data-reveal-item className="card mt-7 overflow-hidden">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={
            "flex items-baseline justify-between gap-4 px-5 py-3.5" +
            (i > 0 ? " border-t border-zinc-100" : "")
          }
        >
          <dt className="text-sm text-zinc-500">{label}</dt>
          <dd className="text-right text-sm font-medium text-zinc-900">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "month" is what Stripe says; "billed monthly" is what a receipt says. */
function billedEvery(interval: string) {
  const adverb: Record<string, string> = {
    day: "billed daily",
    week: "billed weekly",
    month: "billed monthly",
    year: "billed yearly",
  };
  return adverb[interval] ?? "billed every " + interval;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // An unexpected currency code shouldn't cost us the whole receipt.
    return amount.toFixed(2) + " " + currency;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
