import { describe, expect, it, vi, afterEach } from "vitest";
import { requestJson } from "@/lib/apiClient";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(impl: () => Promise<Response> | never) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

/**
 * The point of this helper is that callers never need a `try`/`catch`, so the
 * cases worth proving are the ones that used to throw.
 */
describe("requestJson", () => {
  it("returns the body on success", async () => {
    mockFetch(async () => Response.json({ recipes: [1, 2] }));

    const result = await requestJson<{ recipes: number[] }>("/x", {}, "nope");
    expect(result).toEqual({ ok: true, data: { recipes: [1, 2] } });
  });

  it("does not throw when fetch rejects", async () => {
    mockFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    const result = await requestJson("/x", {}, "nope");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/couldn't reach the server/i);
      // No response means no status, and the caller shouldn't invent one.
      expect(result.status).toBeNull();
    }
  });

  it("reports the API's own message and the status", async () => {
    mockFetch(async () =>
      Response.json({ error: "Not your recipe" }, { status: 403 })
    );

    const result = await requestJson("/x", {}, "nope");
    expect(result).toMatchObject({
      ok: false,
      error: "Not your recipe",
      status: 403,
    });
  });

  it("survives a success with a body that isn't JSON", async () => {
    mockFetch(async () => new Response("", { status: 200 }));

    const result = await requestJson("/x", {}, "nope");
    expect(result).toEqual({ ok: true, data: {} });
  });

  it("blames the server for a crash with no JSON", async () => {
    mockFetch(async () => new Response("<html>oops</html>", { status: 500 }));

    const result = await requestJson("/x", {}, "Could not save.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/our side/i);
  });
});
