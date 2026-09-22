"use client";

import { useEffect, useState, type ReactNode } from "react";

function chaosDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_CHAOS;
  if (v == null || v === "") return false;
  return v === "0" || v.toLowerCase() === "false";
}

function headersForLog(h: HeadersInit | undefined): Record<string, string> {
  if (h == null) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  if (Array.isArray(h)) return Object.fromEntries(h);
  return { ...h };
}

/** Red chef hat pointer overlay (SVG). */
function ChefHatCursor({ x, y }: { x: number; y: number }) {
  return (
    <svg
      aria-hidden
      className="chaos-chef-hat-cursor"
      width={88}
      height={72}
      style={{
        position: "fixed",
        left: x - 36,
        top: y - 8,
        zIndex: 2147483646,
        pointerEvents: "none",
        filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.35))",
      }}
      viewBox="0 0 88 72"
    >
      <path
        fill="#dc2626"
        d="M44 4 C28 4 14 18 10 34 L6 52 L82 52 L78 34 C74 18 60 4 44 4 Z"
      />
      <ellipse cx="44" cy="52" rx="40" ry="10" fill="#b91c1c" />
      <path
        fill="#fca5a5"
        d="M24 28 Q44 12 64 28 Q52 22 44 24 Q36 22 24 28"
        opacity={0.9}
      />
    </svg>
  );
}

export default function ClientChaosShell({ children }: { children: ReactNode }) {
  const disabled = chaosDisabled();
  const [tick, setTick] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [ramChunks, setRamChunks] = useState<number[][]>([]);

  if (!disabled) {
    console.log("[CHAOS shell] render", tick);
  }

  useEffect(() => {
    if (disabled) return;
    document.documentElement.classList.add("chaos-cursor-none");
    return () => document.documentElement.classList.remove("chaos-cursor-none");
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    let id = 0;
    function frame() {
      setTick((t) => t + 1);
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const CAP = 80;
    const interval = window.setInterval(() => {
      setRamChunks((c) => {
        if (c.length >= CAP) return c;
        return [...c, Array.from({ length: 4000 }, () => Math.random())];
      });
    }, 400);
    return () => clearInterval(interval);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const onMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      let url = "";
      try {
        url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
      } catch {
        url = "[unknown]";
      }
      const method =
        init?.method ?? (input instanceof Request ? input.method : "GET");
      const bodyLen =
        init?.body == null
          ? 0
          : typeof init.body === "string"
            ? init.body.length
            : "[binary]";
      console.log("[CHAOS fetch] →", method, url, {
        bodyLen,
        headers: headersForLog(init?.headers),
      });
      return orig(input, init).then((res) => {
        console.log("[CHAOS fetch] ←", res.status, url);
        return res;
      });
    };
    return () => {
      window.fetch = orig;
    };
  }, [disabled]);

  void ramChunks;

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="chaos-root min-h-full flex flex-col chaos-cpu-burn">
      <div className="chaos-heat-layer" aria-hidden />
      <ChefHatCursor x={mouse.x} y={mouse.y} />
      {children}
    </div>
  );
}
