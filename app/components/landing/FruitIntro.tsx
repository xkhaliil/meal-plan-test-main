"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";
import { getLenis } from "@/app/components/motion/SmoothScroll";
import { FRUITS, centroid, fruitMarkup, type FruitDef } from "./fruits";
import { announceReveal } from "./introSignal";

/**
 * Module scope, so it resets on a full page load but survives client-side
 * navigation: a reload plays the intro, coming back to /landing from inside
 * the app does not.
 */
let hasPlayedThisPageLoad = false;

const clamp = (min: number, max: number, v: number) =>
  Math.max(min, Math.min(max, v));

interface Drop {
  fruit: FruitDef;
  width: number;
  height: number;
  /** Where the body's centre starts. */
  x: number;
  y: number;
  angle: number;
}

/** The original's `--fruit-base`, the size its fruit are scaled from. */
function fruitBase(vw: number) {
  if (vw <= 480) return clamp(180, 300, vw * 0.24);
  if (vw <= 1024) return clamp(253, 507, vw * 0.34);
  return clamp(220, 440, 28.96 + vw * 0.18);
}

/**
 * The original's pile: every fruit twice, in order, the second copy a little
 * larger; each as wide as its artwork relative to a 300-unit fruit. They
 * start stacked above the top edge, each 90px higher than the last, so they
 * arrive one after another, at random across the screen and slightly turned.
 */
function planDrops(vw: number): Drop[] {
  const base = fruitBase(vw);
  return [0.9, 1]
    .flatMap((copy) =>
      FRUITS.map((fruit) => {
        const width =
          base * (fruit.width / 300) * 1.2 * (fruit.scale ?? 1) * 0.8 * copy;
        return { fruit, width, height: (width * fruit.height) / fruit.width };
      })
    )
    .map((d, i) => ({
      ...d,
      x: Math.max(
        60,
        d.width * 0.15 + Math.random() * Math.max(1, vw - d.width * 1.3)
      ),
      y: -(d.height + 140) - i * 90 - Math.random() * 110,
      angle: (Math.random() - 0.5) * 0.24,
    }));
}

/**
 * The landing intro, after agrumeafarm.it's loader: a serif percentage counts
 * to 100 while flat fruit drop from above under real physics (matter-js) and
 * pile up; a dark panel then rushes up from the bottom, covers everything, and
 * slides off the top to reveal the hero. The choreography, the fruit and how
 * they fall are the original's (see fruits.ts); the colours are the app's
 * (`hero-wash` behind, zinc-900 counter and panel).
 *
 * Rendered in the server HTML so it covers the page from the first paint. It
 * is skipped outright under reduced motion and on client-side returns, hidden
 * by the root layout's noscript block without JavaScript, and it holds the
 * page still (Lenis stopped, overflow hidden) only for as long as it plays.
 */
export default function FruitIntro() {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (
        !el ||
        !backdrop.current ||
        !stage.current ||
        !counter.current ||
        !panel.current
      )
        return;

      if (prefersReducedMotion() || hasPlayedThisPageLoad) {
        // Before paint, so it never shows at all.
        gsap.set(el, { display: "none" });
        announceReveal();
        return;
      }
      hasPlayedThisPageLoad = true;

      const lenis = getLenis();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      let released = false;
      // Gives the page its scrollbar back. Everything measured while the
      // intro played was measured without it, a scrollbar's width too wide —
      // the hero's pin above all, which would then sit off-centre against
      // the page below it — so ScrollTrigger measures again.
      const release = () => {
        if (released) return;
        released = true;
        document.documentElement.style.overflow = "";
        lenis?.start();
        ScrollTrigger.refresh();
      };

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const drops = planDrops(vw);

      // The fruit nodes, made here because their size depends on the window.
      const nodes = drops.map((d, i) => {
        const node = document.createElement("div");
        node.style.cssText = `position:absolute;left:0;top:0;width:${d.width}px;height:${d.height}px;will-change:transform;`;
        node.innerHTML = fruitMarkup(d.fruit, String(i));
        stage.current!.appendChild(node);
        return node;
      });

      // Physics hulls, in each node's own pixel space, and the centroid the
      // body rotates about — shared by the physics and the drawing.
      const shapes = drops.map((d) => {
        const k = d.width / d.fruit.width;
        const [cx, cy] = centroid(d.fruit.hull);
        return {
          vertices: d.fruit.hull.map(([x, y]) => ({ x: x * k, y: y * k })),
          cx: cx * k,
          cy: cy * k,
        };
      });

      const place = (i: number, x: number, y: number, angle: number) => {
        const s = shapes[i];
        nodes[i].style.transformOrigin = `${s.cx}px ${s.cy}px`;
        nodes[i].style.transform =
          `translate3d(${x - s.cx}px, ${y - s.cy}px, 0) rotate(${angle}rad)`;
      };
      drops.forEach((d, i) => place(i, d.x, d.y, d.angle));

      let raf = 0;
      let stopPhysics = () => {};
      let cancelled = false;

      const count = { value: 0 };
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        counter.current,
        { opacity: 0.2 },
        { opacity: 1, duration: 0.25 },
        0
      )
        .to(
          count,
          {
            value: 100,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => {
              if (counter.current) {
                counter.current.textContent = `${Math.round(count.value)}%`;
              }
            },
          },
          0.12
        )
        // The panel rushes up from the bottom…
        .fromTo(
          panel.current,
          { yPercent: 0 },
          { yPercent: -100, duration: 0.55, ease: "expo.out" },
          2.45
        )
        // …and once it covers the screen, the loader behind it is gone: the
        // page underneath is what the panel uncovers on its way out. The
        // scrollbar comes back now, while the panel hides the page shifting
        // to make room for it.
        .add(() => {
          stopPhysics();
          gsap.set([backdrop.current, stage.current, counter.current], {
            display: "none",
          });
          release();
          announceReveal();
        })
        .to(
          panel.current,
          { yPercent: -200, duration: 0.68, ease: "sine.out" },
          "+=0.04"
        )
        .set(el, { display: "none" });

      (async () => {
        let Matter: typeof import("matter-js") | null = null;
        try {
          // Loaded on demand, and only here: nothing else in the app needs it.
          // If it is slow, the intro runs without the fruit rather than waiting.
          const mod = await Promise.race([
            import("matter-js"),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("slow")), 1500)
            ),
          ]);
          Matter =
            (mod as { default?: typeof import("matter-js") }).default ??
            (mod as typeof import("matter-js"));
        } catch {
          Matter = null;
        }
        if (cancelled) return;

        if (Matter) {
          // The original's world: its gravity, 240px walls and fruit material.
          const { Engine, Bodies, Composite } = Matter;
          const engine = Engine.create({
            gravity: { x: 0, y: 3.35, scale: 0.001 },
          });
          const wall = { isStatic: true, restitution: 0.2, friction: 0.6 };
          Composite.add(engine.world, [
            Bodies.rectangle(vw / 2, vh + 120, vw * 3, 240, wall),
            Bodies.rectangle(-120, vh / 2, 240, vh * 3, wall),
            Bodies.rectangle(vw + 120, vh / 2, 240, vh * 3, wall),
          ]);

          const bodies = drops.map((d, i) =>
            Bodies.fromVertices(d.x, d.y, [shapes[i].vertices], {
              restitution: 0.03,
              friction: 0.82,
              frictionAir: 0.03,
              angle: d.angle,
            })
          );
          Composite.add(engine.world, bodies);

          // A fixed step keeps the pile identical at 60Hz and 144Hz.
          const STEP = 1000 / 60;
          let last = performance.now();
          let acc = 0;
          const frame = (now: number) => {
            acc = Math.min(acc + (now - last), STEP * 4);
            last = now;
            while (acc >= STEP) {
              Engine.update(engine, STEP);
              acc -= STEP;
            }
            bodies.forEach((b, i) =>
              place(i, b.position.x, b.position.y, b.angle)
            );
            raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);

          stopPhysics = () => {
            cancelAnimationFrame(raf);
            Composite.clear(engine.world, false);
            Engine.clear(engine);
          };
        }

        tl.play();
      })();

      return () => {
        // Navigating away mid-intro must not leave the page frozen.
        cancelled = true;
        stopPhysics();
        tl.kill();
        stage.current?.replaceChildren();
        release();
        announceReveal();
      };
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      className="fruit-intro fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
    >
      {/* The hero's own background, in a layer of its own so it can be
          dropped the moment the panel covers the screen. */}
      <div ref={backdrop} className="hero-wash absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          ref={counter}
          className="font-display text-[clamp(6rem,14.2vw,12.8rem)] leading-none tracking-tight text-zinc-900 lining-nums tabular-nums"
        >
          0%
        </span>
      </div>

      <div ref={stage} className="absolute inset-0" />

      <div
        ref={panel}
        // Parked below the screen with `top`, not a transform. GSAP reads any
        // starting transform back as pixels and adds its own on top: Tailwind
        // v4's translate-y-full (the separate `translate` property) and an
        // inline translateY(100%) both left every panel position a full screen
        // too low, so the panel rose only after the hero was revealed.
        className="absolute inset-x-0 top-full h-full bg-zinc-900 will-change-transform"
      />
    </div>
  );
}
