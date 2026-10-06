/**
 * Segment-level fallback for the signed-in area. The pages fetch on the client
 * and render their own skeletons, so this mostly covers the moment before that
 * code is running at all.
 */
export default function Loading() {
  return (
    <div className="px-5 pb-16 pt-10 sm:px-8" aria-hidden>
      <div className="mx-auto max-w-6xl">
        <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-5 h-14 w-80 max-w-full animate-pulse rounded-2xl bg-zinc-100" />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl bg-zinc-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
