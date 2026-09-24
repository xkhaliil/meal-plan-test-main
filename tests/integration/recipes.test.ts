import { describe, expect, it, beforeEach, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Integration: the real route handlers, the real validator and real Prisma,
 * against a throwaway database. Only the session is stubbed — signing a JWT
 * here would test `jsonwebtoken`, not this app.
 */
const session = vi.hoisted(() => ({
  current: null as null | { userId: string; email: string },
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getUserFromRequest: () => session.current,
}));

const { GET, POST } = await import("@/app/api/recipes/route");
const detail = await import("@/app/api/recipes/[id]/route");

function req(body?: unknown, url = "http://localhost/api/recipes") {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const RECIPE = {
  title: "Integration Stew",
  description: "Cooked by a test",
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  cuisine: "Test",
  ingredients: [
    { name: "Carrot", amount: "2", unit: "" },
    { name: "Stock", amount: "500", unit: "ml" },
  ],
};

let ownerId: string;
let otherId: string;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { email: "owner@test.local", password: "x", name: "Owner" },
  });
  const other = await prisma.user.create({
    data: { email: "other@test.local", password: "x", name: "Other" },
  });
  ownerId = owner.id;
  otherId = other.id;
});

beforeEach(async () => {
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  session.current = { userId: ownerId, email: "owner@test.local" };
});

describe("recipes API", () => {
  it("creates a recipe with its ingredients, and reads it back", async () => {
    const created = await POST(req(RECIPE));
    // The handler answers 201 Created, not 200.
    expect(created.status).toBe(201);

    const { recipe } = await created.json();
    expect(recipe.title).toBe("Integration Stew");

    // It really is in the database, with both ingredients attached.
    const stored = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: { ingredients: true },
    });
    expect(stored?.userId).toBe(ownerId);
    expect(stored?.ingredients).toHaveLength(2);

    const listed = await GET(req());
    const { recipes } = await listed.json();
    expect(recipes.map((r: { title: string }) => r.title)).toContain(
      "Integration Stew"
    );
  });

  it("rejects an invalid payload before writing anything", async () => {
    const res = await POST(req({ ...RECIPE, title: "" }));
    expect(res.status).toBe(400);
    expect(await prisma.recipe.count()).toBe(0);
  });

  it("refuses to list the catalog without a session", async () => {
    session.current = null;
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("replaces the ingredient list on update, leaving no orphans", async () => {
    const { recipe } = await (await POST(req(RECIPE))).json();

    const res = await detail.PUT(
      req({
        title: "Renamed",
        ingredients: [{ name: "Only this", amount: "1", unit: "" }],
      }),
      { params: Promise.resolve({ id: recipe.id }) }
    );
    expect(res.status).toBe(200);

    const stored = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: { ingredients: true },
    });
    expect(stored?.title).toBe("Renamed");
    expect(stored?.ingredients.map((i) => i.name)).toEqual(["Only this"]);
    // The two originals are gone, not merely detached.
    expect(await prisma.ingredient.count()).toBe(1);
  });

  it("will not let another user edit or delete it", async () => {
    const { recipe } = await (await POST(req(RECIPE))).json();
    session.current = { userId: otherId, email: "other@test.local" };

    const edit = await detail.PUT(req({ title: "Hijacked" }), {
      params: Promise.resolve({ id: recipe.id }),
    });
    expect(edit.status).toBe(403);

    const remove = await detail.DELETE(req(), {
      params: Promise.resolve({ id: recipe.id }),
    });
    expect(remove.status).toBe(403);

    const stored = await prisma.recipe.findUnique({ where: { id: recipe.id } });
    expect(stored?.title).toBe("Integration Stew");
  });

  it("deletes the recipe and its ingredients together", async () => {
    const { recipe } = await (await POST(req(RECIPE))).json();

    const res = await detail.DELETE(req(), {
      params: Promise.resolve({ id: recipe.id }),
    });
    expect(res.status).toBe(200);

    expect(await prisma.recipe.count()).toBe(0);
    expect(await prisma.ingredient.count()).toBe(0);
  });
});
