import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Authorization tests for the route handlers.
 *
 * Prisma is mocked rather than backed by a test database: what's being checked
 * here is the decision — 401 without a session, 403 when the row belongs to
 * someone else — not that SQLite can store a row. These are the regressions
 * that would be silent and expensive.
 */
const db = {
  recipe: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  ingredient: { deleteMany: vi.fn() },
  mealPlan: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mealPlanRecipe: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const session = vi.hoisted(() => ({
  current: null as null | { userId: string; email: string },
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getUserFromRequest: () => session.current,
}));

const OWNER = { userId: "user-1", email: "owner@example.com" };
const INTRUDER = { userId: "user-2", email: "intruder@example.com" };

function req(body?: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  session.current = OWNER;
});

describe("recipes/[id]", () => {
  it("refuses an unauthenticated delete", async () => {
    session.current = null;
    const { DELETE } = await import("../recipes/[id]/route");
    const res = await DELETE(req(), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);
    expect(db.recipe.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's recipe", async () => {
    db.recipe.findUnique.mockResolvedValue({
      id: "r1",
      userId: INTRUDER.userId,
    });
    const { DELETE } = await import("../recipes/[id]/route");
    const res = await DELETE(req(), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(403);
    expect(db.recipe.delete).not.toHaveBeenCalled();
  });

  it("refuses to edit someone else's recipe", async () => {
    db.recipe.findUnique.mockResolvedValue({
      id: "r1",
      userId: INTRUDER.userId,
    });
    const { PUT } = await import("../recipes/[id]/route");
    const res = await PUT(req({ title: "Hijacked" }), {
      params: Promise.resolve({ id: "r1" }),
    });
    expect(res.status).toBe(403);
    expect(db.recipe.update).not.toHaveBeenCalled();
  });

  it("404s on a recipe that doesn't exist", async () => {
    db.recipe.findUnique.mockResolvedValue(null);
    const { DELETE } = await import("../recipes/[id]/route");
    const res = await DELETE(req(), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("meal-plans/[id]", () => {
  it("refuses to rename someone else's plan", async () => {
    db.mealPlan.findUnique.mockResolvedValue({
      id: "p1",
      userId: INTRUDER.userId,
    });
    const { PUT } = await import("../meal-plans/[id]/route");
    const res = await PUT(req({ name: "Theirs no more" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(403);
    expect(db.mealPlan.update).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's plan", async () => {
    db.mealPlan.findUnique.mockResolvedValue({
      id: "p1",
      userId: INTRUDER.userId,
    });
    const { DELETE } = await import("../meal-plans/[id]/route");
    const res = await DELETE(req(), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an end date that isn't after the start", async () => {
    db.mealPlan.findUnique.mockResolvedValue({
      id: "p1",
      userId: OWNER.userId,
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-01-11"),
    });
    const { PUT } = await import("../meal-plans/[id]/route");
    const res = await PUT(req({ endDate: "2026-01-01" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
    expect(db.mealPlan.update).not.toHaveBeenCalled();
  });
});

describe("meal-plans/[id]/entries/[entryId]", () => {
  it("refuses an entry that belongs to a different plan", async () => {
    // The caller owns plan p1, but the entry hangs off p2.
    db.mealPlan.findUnique.mockResolvedValue({
      id: "p1",
      userId: OWNER.userId,
    });
    db.mealPlanRecipe.findUnique.mockResolvedValue({
      id: "e1",
      mealPlanId: "p2",
    });

    const { DELETE } =
      await import("../meal-plans/[id]/entries/[entryId]/route");
    const res = await DELETE(req(), {
      params: Promise.resolve({ id: "p1", entryId: "e1" }),
    });
    expect(res.status).toBe(404);
    expect(db.mealPlanRecipe.delete).not.toHaveBeenCalled();
  });

  it("removes an entry the caller owns", async () => {
    db.mealPlan.findUnique.mockResolvedValue({
      id: "p1",
      userId: OWNER.userId,
    });
    db.mealPlanRecipe.findUnique.mockResolvedValue({
      id: "e1",
      mealPlanId: "p1",
    });
    db.mealPlanRecipe.delete.mockResolvedValue({ id: "e1" });

    const { DELETE } =
      await import("../meal-plans/[id]/entries/[entryId]/route");
    const res = await DELETE(req(), {
      params: Promise.resolve({ id: "p1", entryId: "e1" }),
    });
    expect(res.status).toBe(200);
    expect(db.mealPlanRecipe.delete).toHaveBeenCalledWith({
      where: { id: "e1" },
    });
  });
});
