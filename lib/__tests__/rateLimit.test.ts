import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The limiter now counts rows in the database, so the interesting behaviour is
 * the decision it makes from that count — and that it fails open rather than
 * locking everyone out when the database is unreachable.
 */
const db = {
  rateLimitHit: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { isRateLimited } = await import("../rateLimit");

beforeEach(() => {
  vi.clearAllMocks();
  db.rateLimitHit.create.mockResolvedValue({ id: "hit" });
  db.rateLimitHit.deleteMany.mockResolvedValue({ count: 0 });
});

describe("isRateLimited", () => {
  it("allows a request below the limit and records it", async () => {
    db.rateLimitHit.count.mockResolvedValue(2);
    expect(await isRateLimited("user-1", 3, 60_000)).toBe(false);
    expect(db.rateLimitHit.create).toHaveBeenCalledWith({
      data: { key: "user-1" },
    });
  });

  it("blocks once the window is full, without recording another hit", async () => {
    db.rateLimitHit.count.mockResolvedValue(3);
    expect(await isRateLimited("user-1", 3, 60_000)).toBe(true);
    expect(db.rateLimitHit.create).not.toHaveBeenCalled();
  });

  it("counts only the key and window it was asked about", async () => {
    db.rateLimitHit.count.mockResolvedValue(0);
    const before = Date.now();
    await isRateLimited("user-2", 5, 60_000);

    const where = db.rateLimitHit.count.mock.calls[0][0].where;
    expect(where.key).toBe("user-2");
    // The floor of the window, not an absolute date.
    const since = where.createdAt.gte.getTime();
    expect(since).toBeGreaterThanOrEqual(before - 60_000 - 50);
    expect(since).toBeLessThanOrEqual(Date.now() - 60_000 + 50);
  });

  it("fails open when the database is unreachable", async () => {
    db.rateLimitHit.count.mockRejectedValue(new Error("db down"));
    expect(await isRateLimited("user-3", 1, 60_000)).toBe(false);
  });
});
