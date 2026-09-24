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
      <body className="flex min-h-screen items-center justify-center bg-yellow px-5 text-center">
        <div>
          <h1 className="font-display text-4xl uppercase leading-none text-brown">
            The app failed to start
          </h1>
          <p className="mt-5 text-brown/70">
            Something broke before the page could render.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-brown/45">
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
