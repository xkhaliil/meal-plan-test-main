import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Without these the non-null assertions below turned a config mistake into a
  // confusing "invalid signature" 400.
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; cannot verify webhooks.");
    return NextResponse.json(
      { error: "Webhook signing is not configured" },
      { status: 500 }
    );
  }
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "pro",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId:
            typeof session.subscription === "string"
              ? session.subscription
              : null,
        },
      });
    }
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object;
    const isInactive =
      event.type === "customer.subscription.deleted" ||
      ["canceled", "unpaid", "incomplete_expired"].includes(
        subscription.status
      );

    if (isInactive) {
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "free", stripeSubscriptionId: null },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
