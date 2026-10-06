"use client";

/**
 * Page numbers with the ends always visible and the current page's neighbours
 * around it: 1 … 4 5 6 … 12. Below eight pages they all fit, so none is hidden.
 */
function pageItems(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "gap")[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(totalPages - 1, page + 1);

  if (from > 2) items.push("gap");
  for (let i = from; i <= to; i++) items.push(i);
  if (to < totalPages - 1) items.push("gap");

  items.push(totalPages);
  return items;
}

const ARROW =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm text-zinc-600 transition-colors enabled:hover:border-zinc-300 enabled:hover:text-zinc-900 disabled:opacity-35";

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Recipe pages"
      className="mt-12 flex flex-col items-center gap-4 border-t border-zinc-200 pt-8 sm:flex-row sm:justify-between"
    >
      <p className="eyebrow order-2 sm:order-1">
        Page {page} of {totalPages}
      </p>

      <div className="order-1 flex flex-wrap items-center justify-center gap-2 sm:order-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={ARROW}
        >
          ←
        </button>

        {pageItems(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-zinc-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={`h-10 min-w-10 shrink-0 rounded-full border px-3 text-sm font-medium tabular-nums transition-colors ${
                item === page
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={ARROW}
        >
          →
        </button>
      </div>
    </nav>
  );
}
