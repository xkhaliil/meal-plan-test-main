import { NextRequest, NextResponse } from "next/server";
import { resolveProSubscriptionPriceId, stripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/auth";

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

  try {
    const priceId = await resolveProSubscriptionPriceId();
    const origin = appOrigin(req);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 3 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        userId: session.userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
