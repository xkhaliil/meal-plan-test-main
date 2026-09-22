// Process-local rate limiter. Resets on restart and does not coordinate
// across multiple server instances — fine for a single dev/interview
// deployment, but a shared store (e.g. Redis) is needed for production.
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }

  recent.push(now);
  buckets.set(key, recent);
  return false;
}
