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
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brown bg-beige text-base text-brown transition-colors enabled:hover:bg-brown enabled:hover:text-yellow disabled:opacity-35";

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
      className="mt-12 flex flex-col items-center gap-4 border-t-2 border-brown pt-8 sm:flex-row sm:justify-between"
    >
      <p className="order-2 text-xs uppercase tracking-[0.2em] text-brown/60 sm:order-1">
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
            <span key={`gap-${i}`} aria-hidden className="px-1 text-brown/45">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={`h-11 min-w-11 shrink-0 rounded-pill border-2 border-brown px-3 text-sm uppercase tracking-wide transition-colors ${
                item === page
                  ? "bg-brown text-yellow"
                  : "bg-beige text-brown hover:bg-brown hover:text-yellow"
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
