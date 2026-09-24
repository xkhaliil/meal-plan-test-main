"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Without this, a thrown error fell through to
 * Next's dev overlay and to a blank page in production.
 *
 * Next 16 passes `unstable_retry` (re-fetches and re-renders the segment) as
 * well as the older `reset` (re-renders only). Both are accepted so this keeps
 * working whichever the runtime supplies.
 */
export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-brown/55">
        Something went wrong
      </p>
      <h1 className="mt-4 font-display text-[clamp(2rem,6vw,64px)] uppercase leading-[0.95] text-brown">
        That didn&apos;t cook
      </h1>
      <p className="mt-5 max-w-[46ch] text-brown/70">
        The page hit an error on its way to you. Trying again often clears it.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-brown/45">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {retry && (
          <button onClick={() => retry()} className="btn btn-primary">
            Try again
          </button>
        )}
        <Link href="/recipes" className="btn btn-secondary">
          Back to the catalog
        </Link>
      </div>
    </div>
  );
}
