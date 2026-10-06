import { FRUITS, centroid, fruitMarkup, type FruitDef } from "./fruits";

/**
 * The fruit drop: agrumeafarm.it's loader pile, under real physics
 * (matter-js). Shared by the landing intro and the sign-in transition, so the
 * two drop the same fruit the same way.
 */

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

/** Loaded on first use and kept: nothing else in the app needs it. */
let physics: Promise<typeof import("matter-js") | null> | null = null;

/**
 * Starts fetching matter-js ahead of a drop, so the fruit can fall the moment
 * they are asked to. Safe to call any number of times.
 */
export function preloadFruitPhysics() {
  physics ??= import("matter-js")
    .then(
      (mod) =>
        (mod as { default?: typeof import("matter-js") }).default ??
        (mod as typeof import("matter-js"))
    )
    .catch(() => {
      physics = null;
      return null;
    });
  return physics;
}

export interface FruitPile {
  /** Settles once the fruit are falling, or once they have been given up on. */
  ready: Promise<void>;
  /** Halts the simulation; the fruit stay where they lie. */
  stop: () => void;
}

/**
 * Drops the pile into `stage`, an element covering the screen. If the physics
 * takes over 1.5s to load the fruit stay out of sight above the top edge, and
 * `ready` settles anyway, so whatever is waiting on it carries on without them.
 */
export function dropFruit(stage: HTMLElement): FruitPile {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const drops = planDrops(vw);

  // The fruit nodes, made here because their size depends on the window.
  const nodes = drops.map((d, i) => {
    const node = document.createElement("div");
    node.style.cssText = `position:absolute;left:0;top:0;width:${d.width}px;height:${d.height}px;will-change:transform;`;
    node.innerHTML = fruitMarkup(d.fruit, String(i));
    stage.appendChild(node);
    return node;
  });

  // Physics hulls, in each node's own pixel space, and the centroid the body
  // rotates about — shared by the physics and the drawing.
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
  let cancelled = false;
  let halt = () => {};

  const ready = (async () => {
    const Matter = await Promise.race([
      preloadFruitPhysics(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (cancelled || !Matter) return;

    // The original's world: its gravity, 240px walls and fruit material.
    const { Engine, Bodies, Composite } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: 3.35, scale: 0.001 } });
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
      bodies.forEach((b, i) => place(i, b.position.x, b.position.y, b.angle));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    halt = () => {
      cancelAnimationFrame(raf);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  })();

  return {
    ready,
    stop: () => {
      cancelled = true;
      halt();
      halt = () => {};
    },
  };
}
