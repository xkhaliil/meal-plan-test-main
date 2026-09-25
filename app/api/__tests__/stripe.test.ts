import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * The billing routes with Stripe and Prisma both mocked.
 *
 * These cover the decisions the app makes around Stripe — who may start a
 * checkout, what a failure tells the browser, and what happens when Stripe has
 * already forgotten a subscription. The webhook's signature handling is covered
 * for real in tests/integration/stripeWebhook.test.ts.
 */
const db = {
  user: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  subscriptions: { cancel: vi.fn() },
  prices: { retrieve: vi.fn() },
}));
const resolvePrice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/stripe", () => ({
  stripe: stripeMock,
  resolveProSubscriptionPriceId: resolvePrice,
}));

const session = vi.hoisted(() => ({
  current: null as null | { userId: string; email: string },
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getUserFromRequest: () => session.current,
}));

const checkout = await import("../stripe/checkout/route");
const cancel = await import("../stripe/cancel/route");
const checkoutSession = await import("../stripe/session/route");

const FREE_USER = {
  id: "user-1",
  email: "free@example.com",
  plan: "free",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

function post(url = "http://localhost/api/stripe/checkout") {
  return new NextRequest(url, { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { userId: "user-1", email: "free@example.com" };
  db.user.findUnique.mockResolvedValue(FREE_USER);
  db.user.update.mockResolvedValue({});
  resolvePrice.mockResolvedValue("price_123");
  stripeMock.checkout.sessions.create.mockResolvedValue({
    url: "https://checkout.stripe.com/c/pay/cs_test_1",
  });
});

describe("POST /api/stripe/checkout", () => {
  it("refuses an unauthenticated caller", async () => {
    session.current = null;
    const res = await checkout.POST(post());
    expect(res.status).toBe(401);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("returns a checkout url for a free user", async () => {
    const res = await checkout.POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
  });

  it("subscribes for one seat, and tags the session with the user", async () => {
    await checkout.POST(post());

    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.mode).toBe("subscription");
    expect(args.line_items).toEqual([{ price: "price_123", quantity: 1 }]);
    expect(args.metadata).toEqual({ userId: "user-1" });
  });

  it("will not sell a second subscription to a Pro user", async () => {
    db.user.findUnique.mockResolvedValue({
      ...FREE_USER,
      plan: "pro",
      stripeSubscriptionId: "sub_existing",
    });

    const res = await checkout.POST(post());
    expect(res.status).toBe(409);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("reuses a known Stripe customer instead of creating another", async () => {
    db.user.findUnique.mockResolvedValue({
      ...FREE_USER,
      stripeCustomerId: "cus_known",
    });

    await checkout.POST(post());
    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.customer).toBe("cus_known");
    expect(args.customer_email).toBeUndefined();
  });

  it("passes the email when there is no customer yet", async () => {
    await checkout.POST(post());
    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.customer_email).toBe("free@example.com");
    expect(args.customer).toBeUndefined();
  });

  it("does not leak Stripe's error text to the browser", async () => {
    stripeMock.checkout.sessions.create.mockRejectedValue(
      new Error(
        "No such price: 'price_123'; a similar object exists in live mode"
      )
    );

    const res = await checkout.POST(post());
    expect(res.status).toBe(500);

    const { error } = await res.json();
    expect(error).toBe("Could not start checkout. Please try again.");
    expect(error).not.toMatch(/price_123|live mode/);
  });

  it("builds return urls from the requesting host", async () => {
    await checkout.POST(
      new NextRequest("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: { host: "app.example.com", "x-forwarded-proto": "https" },
      })
    );

    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.success_url).toContain(
      "https://app.example.com/checkout/success"
    );
    expect(args.cancel_url).toBe("https://app.example.com/checkout/cancel");
  });
});

describe("POST /api/stripe/cancel", () => {
  const PRO_USER = {
    ...FREE_USER,
    plan: "pro",
    stripeSubscriptionId: "sub_active",
  };

  it("refuses an unauthenticated caller", async () => {
    session.current = null;
    const res = await cancel.POST(post());
    expect(res.status).toBe(401);
  });

  it("404s when there is nothing to cancel", async () => {
    const res = await cancel.POST(post());
    expect(res.status).toBe(404);
    expect(stripeMock.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it("cancels at Stripe and downgrades the account", async () => {
    db.user.findUnique.mockResolvedValue(PRO_USER);
    stripeMock.subscriptions.cancel.mockResolvedValue({ id: "sub_active" });

    const res = await cancel.POST(post());
    expect(res.status).toBe(200);
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith("sub_active");
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { plan: "free", stripeSubscriptionId: null },
    });
  });

  it("still downgrades when Stripe has already forgotten the subscription", async () => {
    db.user.findUnique.mockResolvedValue(PRO_USER);
    stripeMock.subscriptions.cancel.mockRejectedValue(
      Object.assign(new Error("No such subscription"), {
        code: "resource_missing",
      })
    );

    const res = await cancel.POST(post());
    // Otherwise the account is stranded on Pro with no way back.
    expect(res.status).toBe(200);
    expect(db.user.update).toHaveBeenCalled();
  });

  it("keeps the plan when Stripe fails for any other reason", async () => {
    db.user.findUnique.mockResolvedValue(PRO_USER);
    stripeMock.subscriptions.cancel.mockRejectedValue(
      Object.assign(new Error("API is down"), { code: "api_error" })
    );

    const res = await cancel.POST(post());
    expect(res.status).toBe(502);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/stripe/price", () => {
  beforeEach(() => {
    // The route caches the price in module scope; a fresh module per test.
    vi.resetModules();
  });

  it("reports the price in major units, so the UI never divides by 100", async () => {
    stripeMock.prices.retrieve.mockResolvedValue({
      unit_amount: 2999,
      currency: "usd",
      recurring: { interval: "month" },
    });

    const { GET } = await import("../stripe/price/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      amount: 29.99,
      currency: "USD",
      interval: "month",
    });
  });

  it("answers with nulls rather than failing the pricing section", async () => {
    resolvePrice.mockRejectedValue(new Error("STRIPE_PRICE_ID is not set"));

    const { GET } = await import("../stripe/price/route");
    const res = await GET();

    // 200 on purpose: the page falls back to "billed monthly" with no figure.
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ amount: null });
  });

  it("serves the second request from cache instead of calling Stripe again", async () => {
    stripeMock.prices.retrieve.mockResolvedValue({
      unit_amount: 2999,
      currency: "usd",
      recurring: { interval: "month" },
    });

    const { GET } = await import("../stripe/price/route");
    await GET();
    await GET();

    expect(stripeMock.prices.retrieve).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/stripe/session", () => {
  const SESSION_URL =
    "http://localhost/api/stripe/session?session_id=cs_test_1";

  /** A completed subscription session, as Stripe returns it with `subscription` expanded. */
  function paidSession(overrides: Record<string, unknown> = {}) {
    return {
      id: "cs_test_1",
      status: "complete",
      payment_status: "paid",
      amount_total: 2999,
      currency: "usd",
      customer: "cus_1",
      customer_details: { email: "free@example.com" },
      metadata: { userId: "user-1" },
      subscription: {
        id: "sub_new",
        items: {
          data: [
            {
              current_period_end: 1767225600,
              price: { recurring: { interval: "month" } },
            },
          ],
        },
      },
      ...overrides,
    };
  }

  function get(url = SESSION_URL) {
    return new NextRequest(url);
  }

  it("refuses an unauthenticated caller", async () => {
    session.current = null;
    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(401);
    expect(stripeMock.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("rejects anything that is not a checkout session id", async () => {
    const res = await checkoutSession.GET(
      get("http://localhost/api/stripe/session?session_id=sub_123")
    );
    expect(res.status).toBe(400);
    expect(stripeMock.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("will not show one account another account's checkout", async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(
      paidSession({ metadata: { userId: "someone-else" } })
    );

    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(403);
    // And the stranger's payment must not upgrade the caller.
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("upgrades the account when the webhook has not arrived yet", async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(paidSession());

    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(200);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        plan: "pro",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_new",
      },
    });
    expect(await res.json()).toMatchObject({ plan: "pro", paid: true });
  });

  it("leaves a user the webhook already upgraded alone", async () => {
    db.user.findUnique.mockResolvedValue({
      ...FREE_USER,
      plan: "pro",
      stripeSubscriptionId: "sub_new",
    });
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(paidSession());

    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(200);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ plan: "pro" });
  });

  it("does not upgrade anyone for a session that was never paid", async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(
      paidSession({ status: "open", payment_status: "unpaid" })
    );

    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(200);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ paid: false, plan: "free" });
  });

  it("reports the receipt in major units, with the renewal date", async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(paidSession());

    const body = await (await checkoutSession.GET(get())).json();
    expect(body).toMatchObject({
      amountTotal: 29.99,
      currency: "USD",
      interval: "month",
      email: "free@example.com",
    });
    expect(body.renewsAt).toBe(new Date(1767225600 * 1000).toISOString());
  });

  it("does not leak Stripe's error text when the lookup fails", async () => {
    stripeMock.checkout.sessions.retrieve.mockRejectedValue(
      new Error("No such checkout.session: 'cs_test_1' in live mode")
    );

    const res = await checkoutSession.GET(get());
    expect(res.status).toBe(502);

    const { error } = await res.json();
    expect(error).not.toMatch(/live mode|cs_test_1/);
  });
});
