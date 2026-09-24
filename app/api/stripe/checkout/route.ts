import { NextRequest, NextResponse } from "next/server";
import { resolveProSubscriptionPriceId, stripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function appOrigin(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Without this, a Pro subscriber who reopens the upgrade page buys a second
  // subscription and is billed twice.
  if (user.plan === "pro" && user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "You're already on Pro." },
      { status: 409 }
    );
  }

  try {
    const priceId = await resolveProSubscriptionPriceId();
    const origin = appOrigin(req);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      // Reuse the customer we already know about, so re-subscribing doesn't
      // scatter duplicate customers (and their payment methods) across Stripe.
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      metadata: {
        userId: session.userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Stripe's messages name price IDs and account configuration; they belong
    // in the logs, not in a response to the browser.
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
