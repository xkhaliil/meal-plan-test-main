import { NextResponse } from "next/server";
import { stripe, resolveProSubscriptionPriceId } from "@/lib/stripe";

/**
 * What Pro actually costs.
 *
 * The amount lives in Stripe, so the landing page and settings had no figure to
 * show. Rather than hardcode a number that could drift from what customers are
 * charged, this reads the live price.
 *
 * Public: it's the same number on the pricing page. Cached for an hour so a
 * marketing page view isn't a Stripe API call.
 */
export const revalidate = 3600;

type CachedPrice = {
  amount: number | null;
  currency: string;
  interval: string | null;
};

let cache: { value: CachedPrice; at: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.value);
  }

  try {
    const priceId = await resolveProSubscriptionPriceId();
    const price = await stripe.prices.retrieve(priceId);

    const value: CachedPrice = {
      // Stripe reports minor units; a display layer shouldn't have to know that.
      amount: price.unit_amount != null ? price.unit_amount / 100 : null,
      currency: price.currency?.toUpperCase() ?? "USD",
      interval: price.recurring?.interval ?? null,
    };

    cache = { value, at: Date.now() };
    return NextResponse.json(value);
  } catch (err) {
    // A missing or misconfigured price must not break the pricing section —
    // the page falls back to "billed monthly" with no figure.
    console.error("Could not read the Pro price from Stripe:", err);
    return NextResponse.json(
      { amount: null, currency: "USD", interval: null },
      { status: 200 }
    );
  }
}
