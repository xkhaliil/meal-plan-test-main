import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  try {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
  } catch (err) {
    // If Stripe no longer has the subscription (cancelled in the dashboard, or
    // a stale id), refusing here would strand the account on "pro" forever
    // with no way back. Treat it as already cancelled and reconcile locally.
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;

    if (code !== "resource_missing") {
      console.error("Stripe subscription cancellation failed:", err);
      return NextResponse.json(
        { error: "Could not cancel the subscription. Please try again." },
        { status: 502 }
      );
    }
    console.warn(
      `Subscription ${user.stripeSubscriptionId} was already gone from Stripe; ` +
        "downgrading locally."
    );
  }

  // The webhook (customer.subscription.deleted) will also reconcile this
  // asynchronously; update optimistically here so the UI reflects it now.
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "free", stripeSubscriptionId: null },
  });

  return NextResponse.json({ success: true });
}
