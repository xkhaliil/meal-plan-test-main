"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";
import ChefLogo from "@/app/components/ChefLogo";
import { useAuthUser } from "@/lib/useAuthUser";
import { onReveal } from "./introSignal";
import { PrimaryNavButton, SecondaryNavButton } from "./NavButtons";

/**
 * The client's back-slider shape: a whole rounded polygon, 1411 × 1473 units.
 * The hero shows its top 601 units, as the original does; the rest carries on
 * below the hero (see the bottom of the markup).
 */
const DOME_PATH =
  "M1092.77 154.666L771.547 15.0903C737.662 0.333261 699.572 -1.66555 664.332 9.40588L300.355 123.57C267.056 134.014 238.272 155.493 218.804 184.499L25.8755 471.755C7.31057 499.396 -1.78055 532.322 -0.00260312 565.609L19.5791 932.135C21.0449 959.492 29.8107 985.958 44.9219 1008.77L231.326 1290.15C248.355 1315.85 272.71 1335.83 301.258 1347.49L579.47 1461.26C605.639 1471.98 634.249 1475.22 662.122 1470.73L1019.8 1412.9C1055.18 1407.16 1087.45 1389.29 1111.03 1362.27L1361.42 1075.41C1384.66 1048.78 1398.02 1014.94 1399.23 979.627L1410.78 641.571C1411.86 609.622 1403 578.126 1385.34 551.469L1159.63 210.758C1143.23 186.005 1120.03 166.528 1092.8 154.704L1092.77 154.666Z";

/** Real dishes from the seeded catalog; the times are prep + cook. */
const PLATES = [
  { slug: "miso-ramen", title: "Miso Ramen", minutes: 65, cuisine: "Japanese" },
  {
    slug: "pasta-carbonara",
    title: "Pasta Carbonara",
    minutes: 30,
    cuisine: "Italian",
  },
  { slug: "greek-salad", title: "Greek Salad", minutes: 15, cuisine: "Greek" },
  {
    slug: "chicken-tikka",
    title: "Chicken Tikka",
    minutes: 65,
    cuisine: "Indian",
  },
  {
    slug: "berry-parfait",
    title: "Berry Parfait",
    minutes: 10,
    cuisine: "American",
  },
  {
    slug: "grilled-salmon",
    title: "Grilled Salmon",
    minutes: 35,
    cuisine: "American",
  },
  {
    slug: "avocado-toast",
    title: "Avocado Toast",
    minutes: 15,
    cuisine: "American",
  },
  { slug: "tom-yum-soup", title: "Tom Yum Soup", minutes: 35, cuisine: "Thai" },
];

/**
 * The dome's width: max(750px, 80vw) as on the original, and 150vw on a phone
 * (the original's 120vw left a thin band at the foot of a tall screen).
 * Shared by the dome and the rest of its shape below the hero, so the two
 * always meet.
 * Breakpoints are written `max-[481px]` / `max-[1025px]` because Tailwind's
 * `max-*` excludes the width itself, while the original (and the sizing in
 * `measure`) counts 480 as a phone and 1024 as a tablet.
 */
const DOME_SIZE = "[--dome-w:max(750px,80vw)] max-[481px]:[--dome-w:150vw]";

/**
 * A phone's plates, × the original's phone size, and their spacing, × its
 * spacing: one plate fills the middle, and its neighbours peek in at the
 * screen's edges.
 */
const PHONE_ITEM = 1.3;
const PHONE_SPACING = 1.05;

/** The widest screen that counts as a phone, as `measure` counts it. */
const PHONE_QUERY = "(max-width: 480px)";

/** A fade over the last 56px either side of the screen, for the dome's words. */
const EDGE_FADE =
  "linear-gradient(to right, transparent calc(50% - 50vw), #000 calc(50% - 50vw + 56px), #000 calc(50% + 50vw - 56px), transparent calc(50% + 50vw))";

/** The words on the dome's badge, once round its circle. */
const DOME_TEXT =
  "PLAN THE WEEK · COOK WHAT YOU LOVE · SHOP ONCE · EAT WELL ALL WEEK · ";

/*
 * Everything below is agrumeafarm.it's jar slider (HomeHero), constant for
 * constant, with plates where it has jars and the plate's text ring where it
 * turns a jar's label.
 */
const JAR_RATIO = 1013 / 630; // item height / width
const TILT = [-0.053, 0.043, -0.024, 0.057, -0.048, 0.029, -0.038, 0.053]; // × item height
const SWAY_DEG = 18; // sine rotation along the track
const SPIN_S = 2; // hover spin, one full turn
const SPIN_DWELL_MS = 260;
const MOVING_PX_S = 6; // "still moving" threshold for the hover spin
const SETTLED = 1.4; // × spacing: speed below which a hover may spin
const SCALE_EDGE = 0.55;
const SCALE_CENTRE = 1.35;
const SCALE_FALLOFF = 0.1;
const BRIGHT_EDGE = 0.7;
const BRIGHT_CENTRE = 1.1;
const BLUR_MAX = 4;
const BLUR_MAX_PHONE = 2;
const INTRO_MS = 1150;
const INTRO_Y = 56;
const INTRO_SCALE = 0.9;
const BADGE_INTRO_DEG = -18;
const ITEM_SIZE = 1.15;
const EASE_RATE = 2.3; // how fast the track catches its goal…
const EASE_RATE_DRAG = 11; // …and while being dragged
const WHEEL = 1.15; // px of track per px of wheel (here: of page scroll)
const DRAG = 1.5;
const FLING_MS = 190;
const FLING_MAX = 3.5; // px/ms
const MAX_DT = 1 / 30;
const SPEED_FULL = 2400; // px/s at which speed effects peak
const SPEED_LEAN = 6;
const SPEED_BLUR = 3.2;
const SPEED_BLUR_PHONE = 1.6;
const SPEED_SQUASH = 0.05;
const BADGE_DEG_PER_PX = -0.012;
const BADGE_DEG_PER_PX_PHONE = -0.03;
const SPREAD = 0.55;
const SPREAD_W = 0.16;
const SPRING_K = 70;
const SPRING_DAMP = 9;
const SPRING_VARY = 0.3;
const SPEED_TURN = 38;
const POINTER_TURN = 30;
const POINTER_FLOOR = 0.3;
const POINTER_LEAN = 5;
const POINTER_LIFT = 0.05;
const POINTER_PULL = 16;
const POINTER_REACH = 1.6; // × item width
const PARALLAX = 26;
const DRAG_THRESHOLD = 6;
const MARQUEE_DEG = 10;

/**
 * The plates' rings: text set round a circle, as they used to be drawn in SVG
 * (`textPath` from the circle's left point, clockwise, `textLength` stretching
 * the spacing to close the circle). Painted once into a canvas: live SVG text
 * is laid out again whenever anything above it moves, which on a moving
 * marquee meant every plate, every frame, and the hero ran at under 20fps.
 * A canvas is only ever rotated and scaled by the compositor. The original
 * draws its jar labels into canvases for the same reason.
 */
interface CircleText {
  view: number; // the drawing's width, in the units below
  radius: number;
  size: number;
  weight: number;
  tracking: number;
  gap: number; // how far short of the full circle the text ends
  colour: string;
}
const RING_TEXT: CircleText = {
  view: 200,
  radius: 86,
  size: 8.2,
  weight: 700,
  tracking: 1.6,
  gap: 2,
  colour: "#71717a", // zinc-500
};

/**
 * The badge's words. On the original they run round a circle behind the jars,
 * in letters big enough to read between them. Plates with text rings are far
 * wider than jars and hid the words, so here they sit on a flatter arc in the
 * part of the dome the plates leave free, sized to the room there. They still
 * move as the original badge does: fading and rising in, drifting with the
 * cursor, and sliding along their circle with the marquee, as far as the rim
 * of the original's badge turns. A circle this flat is too big to paint once
 * and rotate, so the visible strip is redrawn on the frames it moves.
 */
const ARC_CAP = 0.72; // Playfair's cap height, per px of font size
const ARC_GAP = 10; // px kept clear above and below the words
const ARC_RADIUS = 1.1; // × the dome's width, where there is room to curve…
const ARC_FLAT = 8; // …and the flattest it gets where there is not
const ARC_SAFE = 20; // px above the hero's edge where the words have faded out
const ARC_FADE = 0.6; // × the font size: how far above that they start fading
const ARC_RIM = 0.43; // the original badge's text radius, × the badge's width
const DOME_CLIP = typeof Path2D === "undefined" ? null : new Path2D(DOME_PATH);

function paintCircleText(
  canvas: HTMLCanvasElement,
  text: string,
  style: CircleText,
  px: number,
  family: string
) {
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const k = px / style.view;
  const r = style.radius * k;
  ctx.font = `${style.weight} ${style.size * k}px ${family}`;
  ctx.fillStyle = style.colour;
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const natural =
    widths.reduce((a, b) => a + b, 0) + chars.length * style.tracking * k;
  const extra =
    (2 * Math.PI * r - style.gap * k - natural) / Math.max(1, chars.length);
  ctx.translate(px / 2, px / 2);
  let along = 0;
  chars.forEach((c, i) => {
    // Each glyph stands on the circle at its midpoint, top outward.
    ctx.save();
    ctx.rotate(Math.PI + (along + widths[i] / 2) / r);
    ctx.translate(r, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(c, -widths[i] / 2, 0);
    ctx.restore();
    along += widths[i] + style.tracking * k + extra;
  });
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
const clamp = (min: number, max: number, v: number) =>
  Math.max(min, Math.min(max, v));

interface Spring {
  value: number;
  velocity: number;
}
const spring = (): Spring => ({ value: 0, velocity: 0 });
function step(s: Spring, target: number, k: number, dt: number) {
  s.velocity += ((target - s.value) * k - s.velocity * SPRING_DAMP) * dt;
  s.value += s.velocity * dt;
  if (Math.abs(s.velocity) < 0.001 && Math.abs(target - s.value) < 0.001) {
    s.value = target;
    s.velocity = 0;
  }
}

/**
 * The landing hero, after agrumeafarm.it's: a dome on the bottom edge with a
 * text badge inside it, and the products riding an endless marquee tilted
 * 10° across it — scaled, brightened and sharpened toward the centre, leaning
 * with speed, drawn toward the cursor, each turning its label once when
 * hovered. The badge turns with the marquee. Here the jars are plates from the
 * catalog and the label is a ring of text, in the app's colours.
 *
 * The original is a page with nothing below it, so the wheel drives the
 * marquee directly. Here the page continues, so the hero is pinned and page
 * scroll is fed to the marquee exactly as the wheel is there; dragging works
 * as on the original. For the same reason the dome's shape carries on below
 * the hero, down to the polygon's bottom, holding `children`.
 *
 * A phone departs from the original on purpose: one large plate in the
 * middle with its neighbours peeking in, hung midway between the header and
 * a wider dome, and no pin — the hero scrolls away under the thumb, turning
 * the plates as it goes.
 */
export default function PlateHero({ children }: { children?: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const user = useAuthUser();
  const target = user ? "/recipes" : "/register";

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const wrap = el.querySelector<HTMLElement>("[data-wrap]")!;
      const marquee = el.querySelector<HTMLElement>("[data-marquee]")!;
      const shape = el.querySelector<HTMLElement>("[data-shape]")!;
      const header = el.querySelector<HTMLElement>("[data-hero-header]")!;
      const prompt = el.querySelector<HTMLElement>("[data-scroll-cue]")!;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>("[data-plate]")
      );
      const rings = items.map((i) =>
        i.querySelector<HTMLCanvasElement>("[data-plate-ring]")!
      );
      const words = el.querySelector<HTMLCanvasElement>("[data-badge-text]")!;
      const n = items.length;
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
      const reduce = prefersReducedMotion();

      // ---------- Geometry ----------
      let vw = 0,
        phone = false,
        spacing = 0,
        w = 0,
        h = 0,
        loop = 0,
        wave = 0,
        lead = 0,
        cx = 0,
        cy = 0;
      const cos = Math.cos((MARQUEE_DEG * Math.PI) / 180);
      const sin = Math.sin((MARQUEE_DEG * Math.PI) / 180);
      const measure = () => {
        vw = window.innerWidth;
        const vh = window.innerHeight;
        phone = vw <= 480;
        const tablet = !phone && vw <= 1024;
        const unit = vw / (phone || tablet ? 3 : 4);
        spacing = unit * (phone ? 1.15 * PHONE_SPACING : tablet ? 1.265 : 0.92);
        w =
          unit *
          (phone ? 0.73 * PHONE_ITEM : tablet ? 0.7875 : 0.5358) *
          ITEM_SIZE;
        h = w * JAR_RATIO;
        if (h > vh * 0.72) {
          h = vh * 0.72;
          w = h / JAR_RATIO;
        }
        loop = n * spacing;
        wave = 3 * spacing;
        lead = w * 2;
        el.style.setProperty("--item-w", `${w}px`);
        el.style.setProperty("--item-h", `${h}px`);
        el.style.setProperty(
          "--marquee-h",
          `${Math.min(h * 1.35, vh * 0.95)}px`
        );
        // On a phone the plates hang midway between the header and the
        // dome, whatever the screen's height; wider, the original's place.
        marquee.style.top = phone
          ? `${(header.offsetTop + header.offsetHeight + shape.offsetTop) / 2}px`
          : "";
        const s = el.getBoundingClientRect();
        const m = marquee.getBoundingClientRect();
        cx = m.left + m.width / 2 - s.left;
        cy = m.top + m.height / 2 - s.top;
        paintRings();
        layoutArc();
      };

      // Painted straight away in whatever font is ready, and again once the
      // page's fonts have loaded, so the words never wait on a font.
      let fontsReady = false;
      let alive = true;
      const families = () => {
        const css = getComputedStyle(document.documentElement);
        return {
          sans: css.getPropertyValue("--font-manrope").trim() || "sans-serif",
          serif: css.getPropertyValue("--font-playfair").trim() || "serif",
        };
      };

      // The rings, at the largest size they are shown (a centred, lifted
      // plate is 1.35 × 1.05 of its box) for this screen.
      const paintRings = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const ringPx = Math.min(1024, Math.ceil(w * 1.45 * 1.42 * dpr));
        const { sans } = families();
        const key = `${ringPx}|${sans}|${fontsReady}`;
        rings.forEach((ring) => {
          if (ring.dataset.painted === key) return;
          paintCircleText(
            ring,
            ring.dataset.text ?? "",
            RING_TEXT,
            ringPx,
            sans
          );
          ring.dataset.painted = key;
        });
      };

      // The badge's arc: below the centre plate's ring, above the prompt.
      const arc = {
        dpr: 1,
        layerW: 0,
        top: 0, // the canvas's top, in the dome layer
        font: 0,
        radius: 0,
        rim: 0,
        cx: 0,
        cy: 0,
        fadeEnd: 0, // canvas y where the words have faded out…
        fadeLen: 1, // …and how far above it they start to
        family: "",
        drawn: Number.NaN, // the slide last drawn; NaN forces a redraw
      };
      let glyphs: { c: string; w: number; at: number }[] = [];
      // Each letter rendered once into a strip; a frame then only stamps
      // these. Drawing rotated text afresh every frame kept the GPU busy
      // enough to cost a fifth of the frame rate while scrolling.
      const sheet = {
        canvas: null as HTMLCanvasElement | null,
        at: new Map<string, number>(), // each letter's x in the sheet, in px
        pad: 0,
        ascent: 0,
        height: 0,
      };
      const layoutArc = () => {
        const layerW = shape.offsetWidth;
        const layerH = shape.offsetHeight;
        if (!layerW || !layerH) return;
        const layerTop = shape.offsetTop;
        // The centre plate's ring at its lowest: the ring reaches 0.9 of the
        // item's width below its centre at the centre scale, and an item can
        // sit up to 0.057 of its height low.
        const platesBottom = cy + 0.9 * w + 0.057 * h;
        const promptTop = prompt.offsetTop;
        // Not up in the dome's narrow top, where the arc's ends would leave it.
        const from = Math.max(platesBottom + ARC_GAP, layerTop + 0.15 * layerH);
        const room = promptTop - ARC_GAP - from;
        const font = clamp(18, Math.min(40, 10 + 0.028 * vw), room / ARC_CAP);
        const cap = font * ARC_CAP;
        // Centred in the free band; if there is none, tucked just under the
        // plate rather than over the prompt.
        const apex =
          room >= cap ? from + (room - cap) / 2 : promptTop - ARC_GAP - cap;
        const top = apex - font - layerTop;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const { serif } = families();
        const ctx = words.getContext("2d");
        if (!ctx) return;

        words.style.top = `${top}px`;
        words.style.height = `${layerH - top}px`;
        const cw = Math.round(layerW * dpr);
        const ch = Math.max(1, Math.round((layerH - top) * dpr));
        if (words.width !== cw) words.width = cw;
        if (words.height !== ch) words.height = ch;

        ctx.font = `400 ${font}px ${serif}`;
        const chars = Array.from(DOME_TEXT);
        const widths = chars.map((c) => ctx.measureText(c).width);
        const phrase = widths.reduce((a, b) => a + b, 0);
        // "PLAN THE WEEK · COOK WHAT YOU LOVE", centred over the prompt.
        const head = DOME_TEXT.indexOf(" · SHOP");
        // The section clips the words at the hero's bottom edge, where the
        // dome's shape carries on below, so the centred phrase must end clear
        // of it with room to fade. Where the band under the plates is short,
        // the arc flattens until it does (its spacing stretches by up to 12%).
        const half =
          (widths.slice(0, head).reduce((a, b) => a + b, 0) * 1.12) / 2;
        const sag = el.clientHeight - ARC_SAFE - font * ARC_FADE - (apex + cap);
        const radius = clamp(
          ARC_RADIUS * layerW,
          ARC_FLAT * layerW,
          (half * half) / (2 * Math.max(1, sag))
        );
        const family = `${serif}|${fontsReady}`;
        if (
          font !== arc.font ||
          radius !== arc.radius ||
          family !== arc.family ||
          dpr !== arc.dpr
        ) {
          // The phrase as many times as fills the circle, spaced to close it.
          const round = 2 * Math.PI * radius;
          const times = Math.max(1, Math.round(round / (phrase * 1.08)));
          const extra = (round - times * phrase) / (times * chars.length);
          glyphs = [];
          let along = 0;
          for (let t = 0; t < times; t++)
            chars.forEach((c, i) => {
              glyphs.push({ c, w: widths[i], at: along + widths[i] / 2 });
              along += widths[i] + extra;
            });
          const centre =
            (glyphs[0].at -
              glyphs[0].w / 2 +
              glyphs[head - 1].at +
              glyphs[head - 1].w / 2) /
            2;
          glyphs.forEach((g) => (g.at -= centre));

          const pad = Math.ceil(font * 0.15);
          const ascent = Math.ceil(font);
          const height = ascent + Math.ceil(font * 0.3);
          const letters = [...new Set(chars)].filter((c) => c !== " ");
          const canvas = sheet.canvas ?? document.createElement("canvas");
          let x = 0;
          sheet.at.clear();
          letters.forEach((c) => {
            sheet.at.set(c, x);
            x += widths[chars.indexOf(c)] + 2 * pad;
          });
          canvas.width = Math.max(1, Math.ceil(x * dpr));
          canvas.height = Math.ceil(height * dpr);
          const sctx = canvas.getContext("2d");
          if (sctx) {
            sctx.scale(dpr, dpr);
            sctx.font = `400 ${font}px ${serif}`;
            sctx.fillStyle = "#ffffff";
            letters.forEach((c) =>
              sctx.fillText(c, sheet.at.get(c)! + pad, ascent)
            );
          }
          Object.assign(sheet, { canvas, pad, ascent, height });
        }
        Object.assign(arc, {
          dpr,
          layerW,
          top,
          font,
          radius,
          rim: ARC_RIM * (phone ? 0.72 : 0.8) * layerW,
          cx: layerW / 2,
          cy: font + cap + radius,
          // Faded out ARC_SAFE above the canvas's bottom (the hero's edge),
          // which covers how far the cursor and the entrance sink the words.
          fadeEnd: layerH - top - ARC_SAFE,
          fadeLen: font * ARC_FADE,
          family,
          drawn: Number.NaN,
        });
      };

      // The words at a given slide (radians along the arc; 0 is at rest).
      const drawArc = (slide: number) => {
        const ctx = words.getContext("2d");
        if (!ctx || !arc.radius) return;
        const { dpr, layerW, top, font, radius } = arc;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, words.width, words.height);
        ctx.save();
        // Clipped to the dome as it is drawn: the artwork 0.96 of the layer
        // wide, centred, from the layer's top.
        if (DOME_CLIP) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.translate(layerW * 0.02, -top);
          ctx.scale((layerW * 0.96) / 1407, (layerW * 0.96) / 1407);
          ctx.clip(DOME_CLIP);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const { canvas: letters, pad, ascent, height } = sheet;
        if (!letters) {
          ctx.restore();
          return;
        }
        const reach =
          Math.asin(Math.min(1, (layerW / 2 + font) / radius)) + 0.05;
        for (const g of glyphs) {
          const sx = sheet.at.get(g.c);
          if (sx === undefined) continue; // a space
          let a = g.at / radius + slide;
          a =
            ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
            Math.PI;
          if (Math.abs(a) > reach) continue;
          // Its lowest point: the baseline's centre, plus the tilt of its ends.
          const low =
            arc.cy - radius * Math.cos(a) + (g.w / 2) * Math.abs(Math.sin(a));
          const alpha = clamp(0, 1, (arc.fadeEnd - low) / arc.fadeLen);
          if (alpha <= 0) continue;
          // Each glyph stands on the circle at its midpoint, top outward.
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(arc.cx, arc.cy);
          ctx.rotate(a - Math.PI / 2);
          ctx.translate(radius, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(
            letters,
            sx * dpr,
            0,
            (g.w + 2 * pad) * dpr,
            height * dpr,
            -g.w / 2 - pad,
            -ascent,
            g.w + 2 * pad,
            height
          );
          ctx.restore();
        }
        ctx.restore();
        arc.drawn = slide;
      };

      measure();
      {
        const { sans, serif } = families();
        Promise.all([
          document.fonts.load(`700 16px ${sans}`),
          document.fonts.load(`400 16px ${serif}`),
        ])
          .catch(() => null)
          .then(() => {
            if (!alive) return;
            fontsReady = true;
            paintRings();
            layoutArc();
          });
      }

      // A canvas whose GPU memory was reclaimed comes back blank; paint again.
      const repaint = () => {
        rings.forEach((r) => delete r.dataset.painted);
        paintRings();
        arc.drawn = Number.NaN;
      };
      [...rings, words].forEach((c) =>
        c.addEventListener("contextrestored", repaint)
      );

      const along = (i: number, offset: number) => {
        let x = (i * spacing + w / 2 + offset + lead) % loop;
        if (x < 0) x += loop;
        return x - lead;
      };

      // ---------- State ----------
      const plates = items.map(() => ({
        over: false,
        queued: false,
        enteredAt: -1,
        dwellAt: -1,
        spinAt: -1,
        turn: spring(),
        lean: spring(),
        lift: spring(),
        pullX: spring(),
        pullY: spring(),
      }));
      // Where the track is, and where it is heading. A phone shows one plate
      // across the middle, so it starts with the second plate centred there
      // rather than with two either side of it.
      let offset = phone ? vw / 2 - (spacing + w / 2) : 0;
      let goal = offset;
      let speed = 0;
      let lastMoved = -1;
      let introAt = -1;
      let pointerIn = false;
      let px = 0,
        py = 0,
        presence = 0,
        parX = 0,
        parY = 0;

      // ---------- Input: drag, as on the original ----------
      let down = false,
        dragging = false,
        dragged = false,
        id = -1,
        startX = 0,
        lastX = 0,
        lastT = 0,
        flick = 0;
      const onDown = (e: PointerEvent) => {
        down = true;
        id = e.pointerId;
        dragging = false;
        dragged = false;
        startX = lastX = e.clientX;
        flick = 0;
        lastT = e.timeStamp || performance.now();
      };
      const onMove = (e: PointerEvent) => {
        if (!down || e.pointerId !== id) return;
        if (!dragging) {
          if (Math.abs(e.clientX - startX) <= DRAG_THRESHOLD) return;
          try {
            wrap.setPointerCapture(e.pointerId);
          } catch {
            return;
          }
          dragging = dragged = true;
          lastX = e.clientX;
          lastT = e.timeStamp || performance.now();
          return;
        }
        const dx = e.clientX - lastX;
        const t = e.timeStamp || performance.now();
        flick = flick * 0.72 + (dx / Math.max(1, t - lastT)) * 0.28;
        lastX = e.clientX;
        lastT = t;
        goal += dx * DRAG;
      };
      const onUp = (e: PointerEvent) => {
        if (id !== -1 && e.pointerId !== id) return;
        if (dragging) {
          try {
            wrap.releasePointerCapture(e.pointerId);
          } catch {}
          goal += clamp(-FLING_MAX, FLING_MAX, flick) * DRAG * FLING_MS;
        }
        flick = 0;
        down = false;
        id = -1;
        dragging = false;
      };
      // A drag must not also follow the plate's link.
      const onClick = (e: MouseEvent) => {
        if (dragged) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        pointerIn = true;
        px = e.clientX;
        py = e.clientY;
      };
      const onLeave = () => {
        pointerIn = false;
      };
      wrap.addEventListener("pointerdown", onDown);
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerup", onUp);
      wrap.addEventListener("pointercancel", onUp);
      wrap.addEventListener("click", onClick, true);
      el.addEventListener("pointermove", onPointer, { passive: true });
      el.addEventListener("pointerleave", onLeave);

      // Hover queues a spin; the "View the recipe" label follows the cursor.
      const movePill = (e: PointerEvent) => {
        if (pill.current)
          pill.current.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
      };
      const showPill = (on: boolean) => {
        pill.current?.style.setProperty("opacity", on ? "1" : "0");
        pill.current?.style.setProperty(
          "visibility",
          on ? "visible" : "hidden"
        );
      };
      const hoverOff: Array<() => void> = [];
      items.forEach((item, i) => {
        const enter = (e: PointerEvent) => {
          if (!fine.matches) return;
          const p = plates[i];
          p.over = p.queued = true;
          p.enteredAt = performance.now();
          movePill(e);
          showPill(true);
        };
        const leave = () => {
          plates[i].over = plates[i].queued = false;
          showPill(false);
        };
        item.addEventListener("pointerenter", enter);
        item.addEventListener("pointermove", movePill);
        item.addEventListener("pointerleave", leave);
        hoverOff.push(() => {
          item.removeEventListener("pointerenter", enter);
          item.removeEventListener("pointermove", movePill);
          item.removeEventListener("pointerleave", leave);
        });
      });

      // ---------- Input: page scroll, fed in as the original feeds the wheel ----------
      // Wider screens hold the hero for three screens while the scroll turns
      // the plates. A phone doesn't: holding a thumb-scrolled page in place
      // reads as stuck, so the hero scrolls away as normal and the plates
      // turn as it goes (and under a swipe, as everywhere).
      let lastScroll = 0;
      const media = gsap.matchMedia();
      media.add(
        { phone: PHONE_QUERY, wider: `not all and ${PHONE_QUERY}` },
        (context) => {
          const onPhone = Boolean(context.conditions?.phone);
          const trigger = ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: onPhone ? "bottom top" : () => `+=${window.innerHeight * 3}`,
            pin: !onPhone,
            onUpdate: (self) => {
              const s = self.scroll();
              goal -= (s - lastScroll) * WHEEL;
              lastScroll = s;
            },
            onRefresh: (self) => {
              lastScroll = self.scroll();
            },
          });
          lastScroll = trigger.scroll();
          return () => trigger.kill();
        }
      );
      // A refresh can change the hero's width without a resize (the intro
      // hands the scrollbar back by refreshing), so measure again after one.
      ScrollTrigger.addEventListener("refresh", measure);

      // ---------- The entrance starts when the intro lifts ----------
      const stopWaiting = onReveal(() => {
        introAt = performance.now();
        prompt.classList.add("is-ready");
      });

      // ---------- The frame ----------
      let last = performance.now();
      let raf = 0;
      const frame = (now: number) => {
        const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
        last = now;
        const motion = !reduce;
        const hovering = motion && pointerIn && fine.matches;
        const box = el.getBoundingClientRect();
        const lx = px - box.left;
        const ly = py - box.top;

        // Cursor parallax, eased in and out.
        if (hovering && box.width > 0 && box.height > 0) {
          const k = 1 - Math.exp(-4 * dt);
          parX += (clamp(-1, 1, (lx / box.width) * 2 - 1) - parX) * k;
          parY += (clamp(-1, 1, (ly / box.height) * 2 - 1) - parY) * k;
        }
        presence += ((hovering ? 1 : 0) - presence) * (1 - Math.exp(-3 * dt));
        if (!hovering && presence < 0.001) presence = 0;
        const gx = parX * presence;
        const gy = parY * presence;

        // The track eases toward its goal; its speed drives the effects.
        const before = offset;
        offset +=
          (goal - offset) *
          (1 - Math.exp(-(dragging ? EASE_RATE_DRAG : EASE_RATE) * dt));
        if (Math.abs(goal - offset) < 0.05) offset = goal;
        speed = dt > 0 ? (offset - before) / dt : 0;
        if (dragging || Math.abs(speed) > MOVING_PX_S) lastMoved = now;
        const settled = !dragging && Math.abs(speed) <= spacing * SETTLED;
        const rush = Math.min(1, Math.abs(speed) / SPEED_FULL);
        const lean = -Math.sign(speed) * rush * SPEED_LEAN;
        const squash = 1 - rush * rush * SPEED_SQUASH;
        const smear = rush * rush * (phone ? SPEED_BLUR_PHONE : SPEED_BLUR);

        // The dome and its badge.
        const intro = easeOutCubic(
          introAt >= 0 ? Math.min(1, (now - introAt) / INTRO_MS) : 0
        );
        shape.style.opacity = `${intro}`;
        // The dome drifts with the cursor and sinks a little when it is high;
        // the rest of its shape below the hero moves with it, so the two
        // outlines never step apart where they meet.
        const drift = gx * -14;
        const sink = (1 - intro) * INTRO_Y * 0.42 + Math.max(0, gy * -10);
        shape.style.transform = `translate3d(calc(-50% + ${drift}px), ${sink}px, 0)`;
        if (foot.current)
          foot.current.style.transform = `translate3d(calc(-50% + ${drift}px), ${sink}px, 0)`;
        words.style.opacity = `${intro}`;
        const lift = (1 - intro) * INTRO_Y * 0.22 + gy * -8;
        words.style.transform = `translate3d(${gx * -10}px, ${lift}px, 0)`;
        // The prompt sits just under the words, so it rises and sinks with
        // them; left behind, it would run into them when the cursor is high.
        prompt.style.transform = `translate3d(0, ${sink + lift}px, 0)`;
        // The badge turns with the track; its words slide along their arc
        // by as much as the original badge's rim would.
        const turn =
          offset * (phone ? BADGE_DEG_PER_PX_PHONE : BADGE_DEG_PER_PX) +
          (1 - intro) * BADGE_INTRO_DEG;
        const slide = arc.radius
          ? (((turn * Math.PI) / 180) * arc.rim) / arc.radius
          : 0;
        if (!(Math.abs(slide - arc.drawn) < 1e-5)) drawArc(slide);

        items.forEach((item, i) => {
          const p = plates[i];
          const q = along(i, offset) / vw;
          const spread =
            (q + SPREAD * SPREAD_W * Math.tanh((q - 0.5) / SPREAD_W)) * vw;
          const arc = q >= 0 && q <= 1 ? Math.sin(q * Math.PI) : 0;
          const away = Math.abs(q - 0.5) / (spacing / vw);
          const size =
            (SCALE_EDGE + arc * (SCALE_CENTRE - SCALE_EDGE)) *
            (1 - SCALE_FALLOFF * Math.min(1, away));
          const bright = BRIGHT_EDGE + arc * (BRIGHT_CENTRE - BRIGHT_EDGE);
          const drop = (1 - intro) * INTRO_Y;
          const grow = INTRO_SCALE + intro * (1 - INTRO_SCALE);
          const sway =
            Math.sin(((i * spacing + offset) / wave) * Math.PI * 2) * SWAY_DEG;
          const rise = TILT[i % TILT.length] * h;
          const ax = spread - vw / 2;
          const ay = rise + drop;
          const sx = cx + ax * cos - ay * sin;
          const sy = cy + ax * sin + ay * cos;

          let turn = motion
            ? -clamp(-1, 1, speed / SPEED_FULL) * SPEED_TURN
            : 0;
          let leanTo = lean;
          let liftTo = 0,
            pullX = 0,
            pullY = 0;
          if (presence > 0) {
            const dx = lx - sx;
            const dy = ly - sy;
            const ux = dx * cos + dy * sin;
            const uy = -dx * sin + dy * cos;
            const reach = w * POINTER_REACH;
            const near = Math.exp(-(ux * ux + uy * uy) / (reach * reach));
            const side = Math.tanh(ux / reach);
            const up = Math.tanh(uy / (h * 0.8));
            const pull =
              presence * (POINTER_FLOOR + (1 - POINTER_FLOOR) * near);
            const depth = size / SCALE_CENTRE;
            turn += side * POINTER_TURN * pull;
            leanTo += side * POINTER_LEAN * near * presence;
            liftTo = POINTER_LIFT * near * presence;
            pullX =
              side * POINTER_PULL * near * presence +
              (gx * cos + gy * sin) * PARALLAX * depth;
            pullY =
              up * POINTER_PULL * near * presence +
              (-gx * sin + gy * cos) * PARALLAX * depth;
          }
          const k =
            SPRING_K *
            (1 - SPRING_VARY / 2 + SPRING_VARY * ((i * 0.618034) % 1));
          step(p.turn, turn, k, dt);
          step(p.lean, leanTo, k, dt);
          step(p.lift, liftTo, k, dt);
          step(p.pullX, pullX, k, dt);
          step(p.pullY, pullY, k, dt);

          item.style.transform = `translate(${spread - w / 2 + p.pullX.value}px, ${rise + drop + p.pullY.value}px) rotate(${sway + p.lean.value}deg) scale(${size * grow * squash * (1 + p.lift.value)})`;
          item.style.opacity = `${intro}`;
          const blur =
            Math.min(phone ? BLUR_MAX_PHONE : BLUR_MAX, away * away) + smear;
          item.style.filter = `brightness(${bright}) blur(${blur.toFixed(2)}px)`;

          // The label: one turn on the way in, one per hover, and the
          // speed- and cursor-driven turn on top.
          if (!settled || !p.over) p.dwellAt = -1;
          else if (p.dwellAt < 0) p.dwellAt = now;
          let spin = 0;
          if (fine.matches) {
            if (
              p.over &&
              p.queued &&
              p.spinAt < 0 &&
              p.dwellAt >= 0 &&
              (p.enteredAt > lastMoved || now - p.dwellAt >= SPIN_DWELL_MS)
            ) {
              p.spinAt = now;
              p.queued = false;
            }
            if (p.spinAt >= 0) {
              const t = (now - p.spinAt) / 1000;
              if (t >= SPIN_S) p.spinAt = -1;
              else spin = easeInOutQuint(t / SPIN_S);
            }
          } else {
            p.spinAt = -1;
            p.queued = p.over = false;
          }
          // As on the original, a spinning item says how far in it is.
          if (p.spinAt >= 0)
            item.dataset.spinElapsed = ((now - p.spinAt) / 1000).toFixed(3);
          else delete item.dataset.spinElapsed;
          rings[i].style.transform =
            `rotate(${-(spin + intro) * 360 - p.turn.value}deg)`;
        });
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      window.addEventListener("resize", measure);

      return () => {
        alive = false;
        [...rings, words].forEach((c) =>
          c.removeEventListener("contextrestored", repaint)
        );
        cancelAnimationFrame(raf);
        stopWaiting();
        media.revert();
        ScrollTrigger.removeEventListener("refresh", measure);
        window.removeEventListener("resize", measure);
        wrap.removeEventListener("pointerdown", onDown);
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerup", onUp);
        wrap.removeEventListener("pointercancel", onUp);
        wrap.removeEventListener("click", onClick, true);
        el.removeEventListener("pointermove", onPointer);
        el.removeEventListener("pointerleave", onLeave);
        hoverOff.forEach((fn) => fn());
      };
    },
    { scope: section }
  );

  return (
    <>
      <section
        ref={section}
        id="plate-hero"
        aria-label="MealPlan"
        // Above what follows, so the top of the shape below (tucked under
        // the hero's bottom edge) never shows over it.
        className="hero-wash relative isolate z-[1] h-[100svh] min-h-[560px] overflow-hidden"
      >
        <h1 className="sr-only">
          MealPlan — plan the week, cook what you love
        </h1>

        {/* ---------- Header: left, centred mark, right ----------
            A grid with equal sides, so the mark sits on the centre line
            whatever the two buttons say. They are centred on the mark. */}
        <div
          data-hero-header
          className="absolute inset-x-0 top-0 z-[120] grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-4 pt-5 sm:px-8 sm:pt-7"
        >
          <div className="mt-1.5 flex justify-start">
            <SecondaryNavButton
              variant="glass"
              href={user ? "/recipes" : "/login"}
              label={user ? "My recipes" : "Sign in"}
              icon={user ? "recipes" : "account"}
            />
          </div>

          <Link
            href="/landing"
            className="flex flex-col items-center"
            aria-label="MealPlan home"
          >
            <ChefLogo size={56} />
            <span className="mt-1.5 font-display text-[16px] uppercase leading-none tracking-[0.06em] text-zinc-900 min-[390px]:text-[19px] sm:text-[26px]">
              MealPlan
            </span>
            <span className="font-display text-[15px] italic leading-tight text-zinc-500">
              Pro
            </span>
          </Link>

          <div className="mt-1.5 flex justify-end">
            <PrimaryNavButton
              compact
              href={target}
              label={user ? "Open the app" : "Start planning free"}
              phoneLabel={user ? "Open app" : "Sign up"}
            />
          </div>
        </div>

        {/* ---------- The dome, on the bottom edge, with its badge ---------- */}
        {/* The original scales the artwork to 0.96 from its bottom edge;
            here it is laid out at 0.96 instead, the same size and place,
            because the rest of the shape below the hero is drawn that way
            and the browser then snaps the two outlines alike. */}
        <div
          data-shape
          aria-hidden
          className={`${DOME_SIZE} pointer-events-none absolute bottom-0 left-1/2 z-[1] w-[var(--dome-w)] px-[calc(var(--dome-w)*0.02)] opacity-0`}
          style={{ transform: "translate3d(-50%, 23.5px, 0)" }}
        >
          <svg viewBox="0 0 1407 601" className="block w-full">
            <path d={DOME_PATH} className="fill-zinc-900" />
          </svg>
          {/* The badge's words on their arc, drawn by drawArc; its top and
              height are set from the plates' layout. On a phone the dome
              is wider than the screen, so the words fade out at the screen's
              edges rather than being cut there; wider, those stops fall
              outside the canvas and the mask does nothing. */}
          <canvas
            data-badge-text
            className="absolute inset-x-0 top-0 h-0 w-full opacity-0"
            style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
          />
        </div>

        {/* ---------- Scroll prompt ---------- */}
        <p
          data-scroll-cue
          className="pointer-events-none absolute bottom-[30px] z-[3] w-full translate-y-7 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-white opacity-0 transition-[opacity,translate] delay-[180ms] duration-[900ms] [&.is-ready]:translate-y-0 [&.is-ready]:opacity-100"
        ></p>

        {/* ---------- The marquee ---------- */}
        <div
          data-wrap
          className="plate-stage absolute inset-0 z-[2] cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
        >
          <div
            data-marquee
            className="absolute left-1/2 top-[55%] h-[var(--marquee-h,560px)] w-screen max-[1025px]:top-[43%] max-[481px]:top-[45%]"
            style={{
              transform: `translate(-50%, -50%) rotate(${MARQUEE_DEG}deg)`,
            }}
          >
            <div className="relative h-full w-full">
              {PLATES.map((plate, i) => {
                const ring =
                  `${plate.title} · ${plate.minutes} min · ${plate.cuisine} · `.toUpperCase();
                return (
                  <Link
                    key={plate.slug}
                    data-plate
                    href={target}
                    draggable={false}
                    aria-label={`${plate.title}, ${plate.minutes} minutes, ${plate.cuisine}. View the recipe.`}
                    className="absolute left-0 top-1/2 -mt-[calc(var(--item-h,320px)/2)] block h-[var(--item-h,320px)] w-[var(--item-w,200px)] opacity-0 will-change-[transform,opacity,filter]"
                  >
                    {/* The plate sits centred in the jar-sized box, its photo as wide as a jar. */}
                    <span className="absolute left-1/2 top-1/2 aspect-square w-[145%] -translate-x-1/2 -translate-y-1/2">
                      {/* The ring of text, painted by paintCircleText. */}
                      <canvas
                        data-plate-ring
                        data-text={ring + ring}
                        aria-hidden
                        className="absolute inset-0 h-full w-full will-change-transform"
                      />
                      <span className="absolute left-[15%] top-[15%] h-[70%] w-[70%] overflow-hidden rounded-full border-[6px] border-white bg-zinc-100 shadow-[0_30px_60px_-24px_rgba(24,24,27,0.45)]">
                        <Image
                          src={`/images/plates/${plate.slug}.jpg`}
                          alt=""
                          fill
                          draggable={false}
                          sizes="(max-width: 768px) 150px, 300px"
                          className="pointer-events-none select-none object-cover"
                          priority={i < 5}
                        />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------- The label that follows the cursor over a plate ---------- */}
        <div
          ref={pill}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[130] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-900 opacity-0 shadow-[0_8px_24px_-12px_rgba(24,24,27,0.4)] transition-opacity duration-200"
          style={{ visibility: "hidden" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
          View the recipe
        </div>
      </section>

      {/* ---------- The rest of the shape, below the hero ----------
        The same path at the same scale and with the same drift and sink, so
        the outline carries on unbroken. Its box is the dome's — as wide, and
        moved by the same transform — so the browser snaps both to the same
        pixels; the artwork inside is 0.96 of it, as the dome's is (1407 units
        across, so every size here is a fraction of --dome-w). Three pieces: a
        sliver from just above the hero's edge (tucked under the hero, so a
        sunk dome never opens a gap), a straight run as long as the content
        needs, as wide as the outline where the hero cuts it (1.888 to
        1406.76), and the polygon's bottom. All three are SVG, so their edges
        are smoothed exactly as the dome's are. */}
      <div className={`${DOME_SIZE} relative`}>
        <div
          ref={foot}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 top-[calc(var(--dome-w)*-0.033795)] flex w-[var(--dome-w)] flex-col px-[calc(var(--dome-w)*0.02)]"
          style={{ transform: "translate3d(-50%, 0, 0)" }}
        >
          <svg
            viewBox="0 551.469 1407 49.531"
            preserveAspectRatio="none"
            className="block h-[calc(var(--dome-w)*0.033795)] w-full shrink-0"
          >
            <path d={DOME_PATH} className="fill-zinc-900" />
          </svg>
          {/* 1px into each neighbour, so no seam shows where they meet. */}
          <svg
            viewBox="0 0 1407 1"
            preserveAspectRatio="none"
            className="-my-px block min-h-0 w-full flex-1"
          >
            <rect
              x="1.888"
              width="1404.872"
              height="1"
              className="fill-zinc-900"
            />
          </svg>
          <svg
            viewBox="0 601 1407 873"
            preserveAspectRatio="none"
            className="block h-[calc(var(--dome-w)*0.59565)] w-full shrink-0"
          >
            <path d={DOME_PATH} className="fill-zinc-900" />
          </svg>
        </div>
        {/* At least as tall as the polygon's bottom; the content ends where
            the shape is still 85% as wide, and is no wider than 0.76 of the
            dome, so white text never runs off the dark. */}
        <div className="relative min-h-[calc(var(--dome-w)*0.59565)] px-5 pb-[calc(var(--dome-w)*0.24)] pt-6 sm:pt-8">
          <div className="mx-auto max-w-[calc(var(--dome-w)*0.76)]">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
