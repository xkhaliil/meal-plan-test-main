"use client";

import { useToastStore } from "@/lib/stores/toastStore";
import { cn } from "@/lib/utils";

/**
 * The toast stack, mounted once in the root layout.
 *
 * Errors are announced (`role="alert"`) because they interrupt what someone was
 * doing; confirmations are polite (`role="status"`). The container is always in
 * the DOM so assistive tech has a live region to watch — a region that appears
 * at the same moment as its first message is often missed.
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-zinc-200 bg-white py-3 pl-3 pr-2 shadow-[0_20px_40px_-16px_rgba(24,24,27,0.2)]",
            "animate-in fade-in slide-in-from-bottom-2 duration-200"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
              t.tone === "error" ? "bg-red-600" : "bg-emerald-600"
            )}
            aria-hidden
          >
            {t.tone === "error" ? "!" : "✓"}
          </span>

          <p className="flex-1 pt-0.5 text-sm leading-relaxed text-zinc-700">
            {t.message}
          </p>

          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-zinc-400 transition-colors hover:text-zinc-900"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
