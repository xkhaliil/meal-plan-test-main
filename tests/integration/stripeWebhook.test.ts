import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Integration: the billing webhook end to end — real signature verification
 * (Stripe's own HMAC, via `generateTestHeaderString`) and real database writes.
 *
 * No network: signing and verifying are local crypto. What's being proven is
 * that a genuine Stripe event moves a real user between plans, and that a
 * forged one doesn't.
 */
const WEBHOOK_SECRET = "whsec_test_secret_for_signing";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const stripe = new Stripe("sk_test_placeholder_never_called");
const { POST } = await import("@/app/api/stripe/webhook/route");

function signedRequest(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  // The SDK types every field as required, but the implementation fills in the
  // timestamp, scheme and signature itself — payload and secret are all a
  // caller actually supplies.
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  } as Parameters<typeof stripe.webhooks.generateTestHeaderString>[0]);

  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signature },
  });
}

function checkoutCompleted(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        customer: "cus_test_1",
        subscription: "sub_test_1",
        metadata: {},
        ...overrides,
      },
    },
  };
}

function subscriptionEvent(type: string, status: string, id = "sub_test_1") {
  return {
    id: "evt_test_2",
    type,
    data: { object: { id, status } },
  };
}

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: "billing@test.local", password: "x", name: "Billing" },
  });
  userId = user.id;
});

beforeEach(async () => {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: "free", stripeCustomerId: null, stripeSubscriptionId: null },
  });
});

describe("stripe webhook", () => {
  it("rejects a forged signature without touching the database", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify(checkoutCompleted({ metadata: { userId } })),
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
      })
    );

    expect(res.status).toBe(400);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("free");
  });

  it("rejects a request with no signature at all", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify(checkoutCompleted()),
      })
    );
    expect(res.status).toBe(400);
  });

  it("upgrades the payer to Pro and records their Stripe ids", async () => {
    const res = await POST(
      signedRequest(checkoutCompleted({ metadata: { userId } }))
    );
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("pro");
    expect(user?.stripeCustomerId).toBe("cus_test_1");
    expect(user?.stripeSubscriptionId).toBe("sub_test_1");
  });

  it("acknowledges a session with no userId instead of upgrading a stranger", async () => {
    const res = await POST(signedRequest(checkoutCompleted()));

    // 200 so Stripe stops retrying; the handler logs it instead.
    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("free");
  });

  it("downgrades when the subscription is deleted", async () => {
    await POST(signedRequest(checkoutCompleted({ metadata: { userId } })));

    const res = await POST(
      signedRequest(
        subscriptionEvent("customer.subscription.deleted", "canceled")
      )
    );
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("free");
    expect(user?.stripeSubscriptionId).toBeNull();
  });

  it("downgrades on an update that means the subscription stopped paying", async () => {
    await POST(signedRequest(checkoutCompleted({ metadata: { userId } })));

    await POST(
      signedRequest(
        subscriptionEvent("customer.subscription.updated", "unpaid")
      )
    );

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("free");
  });

  it("leaves an active subscription alone on update", async () => {
    await POST(signedRequest(checkoutCompleted({ metadata: { userId } })));

    await POST(
      signedRequest(
        subscriptionEvent("customer.subscription.updated", "active")
      )
    );

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("pro");
  });

  it("ignores an event for a subscription nobody here owns", async () => {
    await POST(signedRequest(checkoutCompleted({ metadata: { userId } })));

    const res = await POST(
      signedRequest(
        subscriptionEvent(
          "customer.subscription.deleted",
          "canceled",
          "sub_someone_else"
        )
      )
    );
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("pro");
  });

  it("is safe to replay, as Stripe's retries require", async () => {
    const event = checkoutCompleted({ metadata: { userId } });
    await POST(signedRequest(event));
    await POST(signedRequest(event));

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("pro");
    expect(user?.stripeSubscriptionId).toBe("sub_test_1");
  });
});
