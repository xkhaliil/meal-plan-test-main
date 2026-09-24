import { prisma } from "@/lib/prisma";

/**
 * Sliding-window rate limiting, counted in the database.
 *
 * This was an in-process `Map`, which had two problems: it reset on every
 * restart, and each server instance kept its own count — so running three
 * instances handed out three times the allowance. The database is already
 * shared between instances and survives restarts, and needs no extra
 * infrastructure to run or review.
 *
 * Trade-off worth knowing: counting and then inserting is not atomic, so two
 * simultaneous requests can both slip through on the boundary. Redis `INCR`
 * with a TTL would be atomic and faster; this is the version that works with
 * what the project already has.
 */

/** Rows older than this are never interesting to any caller. */
const SWEEP_AFTER_MS = 24 * 60 * 60 * 1000;
/** At most one cleanup per process per this interval. */
const SWEEP_EVERY_MS = 10 * 60 * 1000;

let lastSweep = 0;

async function sweepExpired() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;

  try {
    await prisma.rateLimitHit.deleteMany({
      where: { createdAt: { lt: new Date(now - SWEEP_AFTER_MS) } },
    });
  } catch (err) {
    // Housekeeping must never fail a request.
    console.error("Rate limit sweep failed:", err);
  }
}

/**
 * Records an attempt and reports whether the caller is over the limit.
 *
 * Fails open: if the database is unreachable, requests are allowed rather than
 * locking every user out of the app over a limiter.
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const used = await prisma.rateLimitHit.count({
      where: { key, createdAt: { gte: since } },
    });

    if (used >= limit) return true;

    await prisma.rateLimitHit.create({ data: { key } });
    void sweepExpired();
    return false;
  } catch (err) {
    console.error("Rate limit check failed; allowing the request:", err);
    return false;
  }
}
