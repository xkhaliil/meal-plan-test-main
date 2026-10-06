"use client";

import "./globals.css";

/**
 * Last-resort boundary for errors thrown by the root layout itself, which
 * `app/error.tsx` cannot catch. It replaces the root layout when active, so it
 * has to bring its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  const retry = unstable_retry ?? reset;

  return (
    <html lang="en">
      <body className="hero-wash flex min-h-screen items-center justify-center px-5 text-center">
        <div>
          <h1 className="text-4xl tracking-tight sm:text-5xl">
            The app failed to start
          </h1>
          <p className="mt-5 text-lg text-zinc-400">
            Something broke before the page could render.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-zinc-300">
              Reference: {error.digest}
            </p>
          )}
          {retry && (
            <button onClick={() => retry()} className="btn btn-primary mt-8">
              Reload
            </button>
          )}
        </div>
      </body>
    </html>
  );
}
