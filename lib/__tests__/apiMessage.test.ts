import { describe, expect, it } from "vitest";
import { messageForFailedResponse } from "@/lib/apiMessage";

/** A Response with a JSON body, as the API routes send. */
function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A platform error page: the shape a crashed route actually returns. */
function html(status: number) {
  return new Response("<!DOCTYPE html><title>500</title>", {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

describe("messageForFailedResponse", () => {
  it("prefers the API's own message", async () => {
    const res = json({ error: "Invalid credentials" }, 401);
    expect(await messageForFailedResponse(res, "fallback")).toBe(
      "Invalid credentials"
    );
  });

  it("ignores an empty or non-string error field", async () => {
    expect(
      await messageForFailedResponse(json({ error: "  " }, 400), "fb")
    ).toBe("fb");
    expect(await messageForFailedResponse(json({ error: 42 }, 400), "fb")).toBe(
      "fb"
    );
  });

  it("says it is our fault when the route crashed with no JSON", async () => {
    // The case that mattered: a 500 from a route that threw at import used to
    // be reported to the user as "Login failed".
    const message = await messageForFailedResponse(html(500), "Login failed");
    expect(message).not.toBe("Login failed");
    expect(message).toMatch(/our side|nothing you did/i);
  });

  it("distinguishes a temporary outage from a crash", async () => {
    for (const status of [502, 503, 504]) {
      expect(await messageForFailedResponse(html(status), "fb")).toMatch(
        /temporarily unavailable/i
      );
    }
  });

  it("names rate limiting for what it is", async () => {
    expect(await messageForFailedResponse(html(429), "fb")).toMatch(
      /too many attempts/i
    );
  });

  it("falls back for an ordinary client error with no body", async () => {
    expect(await messageForFailedResponse(html(400), "Check the form")).toBe(
      "Check the form"
    );
  });
});
