"use client";

import Link from "next/link";
import ChefLogo from "@/app/components/ChefLogo";
import { CookingGifBackdrop } from "@/app/components/CookingGifPlaster";
import { useEffect, useState } from "react";

const JUNK_ORB_COUNT = 52;

export default function LandingPage() {
  const [tick, setTick] = useState(0);
  const [tickB, setTickB] = useState(0);

  useEffect(() => {
    const a = window.setInterval(() => setTick((t) => t + 1), 28);
    const b = window.setInterval(() => setTickB((t) => t + 1), 41);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);

  return (
    <div
      className="landing-root relative min-h-screen overflow-x-hidden text-fuchsia-100"
      style={{
        background:
          "linear-gradient(160deg, #0d0221 0%, #3b0764 25%, #7c3aed 45%, #a855f7 55%, #2e1065 78%, #1e0538 100%)",
        fontFamily: "Georgia, 'Comic Sans MS', Papyrus, serif",
        boxShadow: "inset 0 0 120px rgba(191, 0, 255, 0.45)",
      }}
    >
      {/* Fixed blur overlay: animates expensive backdrop-filter */}
      <div
        className="landing-blur-layer pointer-events-none fixed inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(217,70,239,0.15), transparent 50%), radial-gradient(circle at 70% 90%, rgba(124,58,237,0.2), transparent 45%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[4] opacity-25 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(192, 38, 211, 0.2), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 75%, rgba(124, 58, 237, 0.15), transparent 50%)",
        }}
        aria-hidden
      />

      <CookingGifBackdrop stackClass="z-[6]" />

      {/* Junk orbs: dozens of inline styles recomputed every tick */}
      {Array.from({ length: JUNK_ORB_COUNT }, (_, i) => (
        <span
          key={i}
          className="pointer-events-none fixed z-[3] rounded-full bg-fuchsia-400/25"
          style={{
            width: 6 + (i % 5) * 3,
            height: 6 + (i % 5) * 3,
            left: `${48 + Math.sin(tick * 0.11 + i * 0.7) * 42}%`,
            top: `${48 + Math.cos(tickB * 0.09 + i * 0.55) * 44}%`,
            boxShadow: `0 0 ${8 + (i % 4) * 4}px rgba(217, 70, 239, 0.5)`,
            transform: `rotate(${tick * 2 + i * 13}deg)`,
            willChange: "left, top, transform, box-shadow",
          }}
          aria-hidden
        />
      ))}

      <header
        className="landing-jitter relative z-10 flex flex-wrap items-end justify-between gap-4 px-3 py-6 md:px-12"
        style={{
          borderBottom: "8px dotted #e879f9",
          boxShadow: "0 4px 24px rgba(216, 180, 254, 0.6)",
        }}
      >
        <div className="landing-wobble flex items-center gap-1">
          <span className="landing-orbit inline-flex">
            <ChefLogo size={72} href={null} priority />
          </span>
          <span
            className="landing-title-glow font-black uppercase tracking-widest"
            style={{
              fontSize: "clamp(1.4rem, 5vw, 3rem)",
              lineHeight: 0.9,
              color: "#f0abfc",
            }}
          >
            Landing
          </span>
        </div>
        <nav className="flex flex-col items-end gap-2 text-right text-sm">
          <a
            href="#stuff"
            className="landing-footer-shake text-fuchsia-200 underline decoration-wavy decoration-fuchsia-400"
            style={{ textShadow: "0 0 8px #e879f9" }}
          >
            Stuff
          </a>
          <a
            href="#more"
            className="landing-cta-pulse bg-fuchsia-500 px-2 py-1 font-bold text-purple-950"
            style={{ boxShadow: "0 0 16px #d946ef" }}
          >
            More
          </a>
          <span className="landing-blink cursor-default text-purple-300/70 line-through">Enterprise</span>
        </nav>
      </header>

      <main className="relative z-10 px-2 pb-24 pt-8 md:px-8">
        <section className="relative mx-auto max-w-4xl">
          <p
            className="landing-jitter mb-6 text-center font-serif text-lg text-purple-200"
            style={{ marginLeft: "18%", marginRight: "-5%", maxWidth: "40rem" }}
          >
            Meal plans, recipes, and AI chat — without pretending the homepage has to open with
            &ldquo;welcome.&rdquo;
          </p>

          <h1
            className="landing-wobble mb-4 bg-violet-950 px-4 py-2 font-sans text-2xl font-bold shadow-lg"
            style={{
              width: "fit-content",
              marginLeft: `${58 + Math.sin(tick * 0.08) * 4}%`,
              color: "#fae8ff",
              textShadow: "0 0 12px #e879f9, 0 0 28px #a855f7",
              border: "2px solid #d946ef",
            }}
          >
            WE DO THINGS WITH MEALS
          </h1>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
            <div
              className="landing-card-rave border-4 border-fuchsia-400 bg-purple-900/50 p-8 text-center backdrop-blur-sm md:col-span-2"
              style={{ borderRadius: "3px 40px 8px 90px" }}
            >
              <h2
                className="landing-title-glow"
                style={{ fontSize: "11px", textTransform: "uppercase", color: "#e9d5ff" }}
              >
                Why us maybe
              </h2>
              <p className="mt-3 text-left text-sm leading-tight text-purple-100/90 md:text-base">
                Our platform leverages synergy between culinary vectors and AI-adjacent experiences.
                Users enjoy outcomes. Some outcomes involve recipes. Others involve thinking about
                recipes. It depends on the moon phase.
              </p>
            </div>
            <div
              className="landing-cta-pulse relative -mt-4 self-center justify-self-end bg-fuchsia-600 p-4 md:mt-12"
              style={{
                left: `${10 + Math.sin(tickB * 0.12) * 6}px`,
                top: `${-28 + Math.cos(tick * 0.1) * 5}px`,
                boxShadow: "0 0 20px #c026d3, inset 0 0 20px rgba(250, 232, 255, 0.2)",
              }}
            >
              <p className="w-32 rotate-3 text-xs font-bold text-purple-950">
                FAST* (*terms: not a guarantee)
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-around gap-6 opacity-95">
            <button
              type="button"
              className="landing-wobble border-2 border-fuchsia-300 bg-purple-950 px-8 py-4 text-xl font-black text-fuchsia-300 shadow-[6px_6px_0_#86198f]"
              style={{
                fontFamily: "Impact, sans-serif",
                textShadow: "0 0 10px #e879f9",
              }}
            >
              GET STARTED (?)
            </button>
            <a
              href="/login"
              className="landing-jitter text-sm text-purple-200 underline decoration-wavy decoration-fuchsia-400 underline-offset-4"
              style={{ textShadow: "0 0 6px #c084fc" }}
            >
              or log in if you want
            </a>
            <button
              type="button"
              className="landing-orbit scale-75 bg-gradient-to-r from-purple-600 to-fuchsia-500 px-3 py-1 text-[10px] text-white"
              style={{ boxShadow: "0 0 12px #a855f7" }}
            >
              LEARN MORE — same page
            </button>
          </div>

          <section
            id="stuff"
            className="landing-card-rave mt-20 border-t-8 border-fuchsia-500 pt-10"
            style={{ boxShadow: "0 -8px 32px rgba(217, 70, 239, 0.25)" }}
          >
            <h3
              className="landing-title-glow mb-8 w-3/4 font-mono text-4xl text-fuchsia-300"
              style={{
                marginLeft: "22%",
                lineHeight: "0.7",
              }}
            >
              Features
              <br />
              <span className="text-lg font-normal text-purple-300">(selection)</span>
            </h3>
            <ul className="columns-1 gap-12 space-y-6 text-sm text-purple-100 md:columns-2" style={{ columnGap: "4rem" }}>
              <li className="break-inside-avoid pl-6" style={{ listStyle: "hebrew" }}>
                <strong className="text-fuchsia-400">Smart</strong> — we use computers
              </li>
              <li className="break-inside-avoid" style={{ paddingLeft: "3rem", listStyle: "cjk-ideographic" }}>
                Cloud-ready (your kitchen might also be a cloud metaphorically)
              </li>
              <li className="break-inside-avoid text-center md:text-left">
                24/7 except when we sleep
              </li>
              <li className="break-inside-avoid -ml-2 max-w-xs text-xs leading-relaxed text-purple-200/80">
                GDPR-friendly-ish — we have heard of privacy. Landing respects the concept of data
                in the abstract.
              </li>
            </ul>
          </section>

          <section
            id="more"
            className="landing-blur-layer relative z-10 mt-24 rounded-lg border-2 border-purple-400 bg-violet-950/80 p-6 md:p-10"
            style={{ boxShadow: "inset 0 0 80px rgba(168, 85, 247, 0.5), 0 0 40px rgba(192, 38, 211, 0.3)" }}
          >
            <div
              className="landing-orbit absolute -right-4 top-1/2 z-0 h-32 w-32 rounded-full bg-fuchsia-500 opacity-50"
              style={{
                transform: `translateY(-50%) rotate(${12 + tick}deg)`,
                boxShadow: "0 0 30px #e879f9",
              }}
              aria-hidden
            />
            <blockquote className="relative z-10 text-center italic text-purple-200">
              &ldquo;It was an experience.&rdquo;
              <footer className="mt-2 not-italic text-xs text-fuchsia-300/80">— Someone, probably</footer>
            </blockquote>
          </section>

          <div
            className="landing-footer-shake mt-16 flex justify-between gap-4 text-[0.65rem] uppercase tracking-tighter text-fuchsia-200/90"
            style={{ letterSpacing: "-0.05em", textShadow: "0 0 8px #a855f7" }}
          >
            <span>© 20XX Landing</span>
            <span>Not financial advice</span>
            <span>Patent pending (no)</span>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="landing-cta-pulse inline-block bg-fuchsia-600 px-6 py-2 font-semibold text-purple-950"
              style={{
                borderRadius: "999px 0 999px 0",
                boxShadow: "0 0 20px #d946ef, 0 0 40px #7c3aed",
              }}
            >
              Okay go to login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
