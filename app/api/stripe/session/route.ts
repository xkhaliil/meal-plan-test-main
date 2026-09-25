import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * What a returning payer's checkout session actually says.
 *
 * `/checkout/success` used to announce "You're on Pro" to anyone who loaded the
 * URL, whether or not a payment had happened — the page was static. This reads
 * the session back from Stripe so the page can tell the truth, and hands over
 * the few details worth showing as a receipt.
 *
 * Fulfilment normally arrives on the webhook (`checkout.session.completed`).
 * That's still the primary path; this endpoint reconciles the same fields when
 * the webhook hasn't landed yet — a delivery delay in production, or no
 * `stripe listen` running in development. The update is idempotent and only
 * runs for a session Stripe itself reports as paid.
 */
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("session_id");
  if (!id || !id.startsWith("cs_")) {
    return NextResponse.json(
      { error: "Missing checkout session id" },
      { status: 400 }
    );
  }

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(id, {
      expand: ["subscription"],
    });
  } catch (err) {
    console.error("Could not retrieve checkout session " + id + ":", err);
    return NextResponse.json(
      { error: "We couldn't look that payment up. Try again in a moment." },
      { status: 502 }
    );
  }

  // The id travels in a URL, so it can be pasted, shared or guessed at. Only
  // the account the session was created for may read it — and the response
  // never says whose it is otherwise.
  if (checkoutSession.metadata?.userId !== session.userId) {
    return NextResponse.json(
      { error: "That checkout session doesn't belong to this account." },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const paid =
    checkoutSession.payment_status === "paid" ||
    checkoutSession.payment_status === "no_payment_required";
  const complete = checkoutSession.status === "complete";

  const subscription =
    typeof checkoutSession.subscription === "string"
      ? null
      : checkoutSession.subscription;
  const subscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : (subscription?.id ?? null);

  let plan = user.plan;

  if (paid && complete && plan !== "pro") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: "pro",
        stripeCustomerId:
          typeof checkoutSession.customer === "string"
            ? checkoutSession.customer
            : (checkoutSession.customer?.id ?? user.stripeCustomerId),
        stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
      },
    });
    plan = "pro";
    console.warn(
      "Upgraded " +
        user.id +
        " from the success page; the webhook for " +
        id +
        " had not arrived."
    );
  }

  // As of the 2025 API the period lives on the subscription item, not the
  // subscription.
  const item = subscription?.items?.data?.[0];

  return NextResponse.json({
    status: checkoutSession.status,
    paid,
    plan,
    // Stripe reports minor units; a display layer shouldn't have to know that.
    amountTotal:
      checkoutSession.amount_total != null
        ? checkoutSession.amount_total / 100
        : null,
    currency: (checkoutSession.currency ?? "usd").toUpperCase(),
    interval: item?.price?.recurring?.interval ?? null,
    renewsAt: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
    email: checkoutSession.customer_details?.email ?? null,
  });
}
