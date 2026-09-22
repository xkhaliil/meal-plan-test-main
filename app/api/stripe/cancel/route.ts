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
    const message = err instanceof Error ? err.message : "Cancellation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // The webhook (customer.subscription.deleted) will also reconcile this
  // asynchronously; update optimistically here so the UI reflects it now.
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "free", stripeSubscriptionId: null },
  });

  return NextResponse.json({ success: true });
}
