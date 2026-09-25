import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * The Recipe Bot route with the model, the database and the limiter mocked.
 *
 * The cases that matter here are the ones a user actually hits when something
 * upstream is wrong: a rejected API key, a provider outage, an exhausted free
 * plan. Each should say something true and leave the database consistent.
 */
const db = {
  user: { findUnique: vi.fn() },
  chatMessage: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  recipe: { create: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const openaiMock = vi.hoisted(() => ({
  chat: { completions: { create: vi.fn() } },
}));
vi.mock("@/lib/openai", () => ({ openai: openaiMock }));

const rateLimited = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({ isRateLimited: rateLimited }));

vi.mock("@/lib/nanoBanana", () => ({ generateRecipeImage: vi.fn() }));

const session = vi.hoisted(() => ({
  current: null as null | { userId: string; email: string },
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getUserFromRequest: () => session.current,
}));

const { POST, GET } = await import("../chat/route");

const FREE_USER = { id: "user-1", email: "bob@example.com", plan: "free" };

function post(message = "Give me a dinner idea") {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

/** An error shaped like the OpenAI SDK's. */
function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { userId: "user-1", email: "bob@example.com" };
  db.user.findUnique.mockResolvedValue(FREE_USER);
  db.chatMessage.count.mockResolvedValue(0);
  db.chatMessage.create.mockResolvedValue({ id: "m1" });
  db.chatMessage.findMany.mockResolvedValue([]);
  rateLimited.mockResolvedValue(false);
  openaiMock.chat.completions.create.mockResolvedValue({
    choices: [{ message: { content: "How about a stew?", tool_calls: [] } }],
  });
});

describe("POST /api/chat", () => {
  it("refuses an unauthenticated caller", async () => {
    session.current = null;
    const res = await POST(post());
    expect(res.status).toBe(401);
    expect(openaiMock.chat.completions.create).not.toHaveBeenCalled();
  });

  it("rejects an empty message before calling the model", async () => {
    const res = await POST(post("   "));
    expect(res.status).toBe(400);
    expect(openaiMock.chat.completions.create).not.toHaveBeenCalled();
  });

  it("returns the reply and the remaining quota", async () => {
    const res = await POST(post());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBe("How about a stew?");
    expect(body.quota).toMatchObject({ plan: "free", limit: 5 });
  });

  it("stops a free user at the daily limit without calling the model", async () => {
    db.chatMessage.count.mockResolvedValue(5);
    const res = await POST(post());

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining("Upgrade to Pro"),
    });
    expect(openaiMock.chat.completions.create).not.toHaveBeenCalled();
  });

  it("lets a Pro user past the daily limit", async () => {
    db.user.findUnique.mockResolvedValue({ ...FREE_USER, plan: "pro" });
    db.chatMessage.count.mockResolvedValue(500);

    const res = await POST(post());
    expect(res.status).toBe(200);
  });

  it("refuses when the caller is over the hourly rate limit", async () => {
    rateLimited.mockResolvedValue(true);
    const res = await POST(post());

    expect(res.status).toBe(429);
    expect(openaiMock.chat.completions.create).not.toHaveBeenCalled();
  });

  it("says it is misconfigured — not 'try again' — when the key is rejected", async () => {
    openaiMock.chat.completions.create.mockRejectedValue(
      apiError(401, "Incorrect API key provided: sk-proj-…w4sA")
    );

    const res = await POST(post());
    // 503, because retrying a rejected credential can never succeed.
    expect(res.status).toBe(503);

    const { error } = await res.json();
    expect(error).toMatch(/isn't set up correctly/i);
    // The key, even partially, must never reach the browser.
    expect(error).not.toMatch(/sk-proj|API key/i);
  });

  it("asks the user to retry when the provider is merely down", async () => {
    openaiMock.chat.completions.create.mockRejectedValue(
      apiError(500, "internal server error")
    );

    const res = await POST(post());
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining("try again"),
    });
  });

  it("keeps a timeout on the model call", async () => {
    await POST(post());
    const [, options] = openaiMock.chat.completions.create.mock.calls[0];
    expect(options?.timeout).toBeGreaterThan(0);
  });
});

describe("GET /api/chat", () => {
  it("returns the transcript and the quota", async () => {
    db.chatMessage.findMany.mockResolvedValue([
      { id: "m1", role: "user", content: "hi", createdAt: new Date() },
    ]);

    const res = await GET(new NextRequest("http://localhost/api/chat"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.quota.remaining).toBe(5);
  });

  it("only reads messages that have not been archived", async () => {
    await GET(new NextRequest("http://localhost/api/chat"));
    expect(db.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", archived: false },
      })
    );
  });
});
