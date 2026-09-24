/**
 * Segment-level fallback for the signed-in area. The pages fetch on the client
 * and render their own skeletons, so this mostly covers the moment before that
 * code is running at all.
 */
export default function Loading() {
  return (
    <div className="px-5 py-12 sm:px-[30px]" aria-hidden>
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-28 animate-pulse rounded-pill bg-brown/10" />
        <div className="mt-5 h-20 w-80 max-w-full animate-pulse rounded-card bg-brown/10" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-card bg-brown/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
