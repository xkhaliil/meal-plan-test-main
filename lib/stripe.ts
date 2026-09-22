import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function isPlaceholderStripePriceId(id: string | undefined): boolean {
  return !id || id.includes("placeholder");
}

/**
 * Checkout `line_items[].price` must be a Price ID (`price_...`), not a Product ID (`prod_...`).
 * Prefer STRIPE_PRICE_ID when set; otherwise look up the first active recurring price on STRIPE_PRO_PRODUCT_ID.
 */
export async function resolveProSubscriptionPriceId(): Promise<string> {
  const explicit = process.env.STRIPE_PRICE_ID?.trim();
  if (explicit && !isPlaceholderStripePriceId(explicit)) {
    return explicit;
  }

  const productId = process.env.STRIPE_PRO_PRODUCT_ID?.trim();
  if (!productId) {
    throw new Error(
      "Set STRIPE_PRO_PRODUCT_ID to your Pro product ID (prod_...) or set STRIPE_PRICE_ID to a real recurring price ID (price_...)."
    );
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 10,
  });

  const price =
    prices.data.find((p) => p.recurring != null) ?? prices.data[0];
  if (!price?.id) {
    throw new Error(
      `No active recurring price on product ${productId}. Add one in Stripe Dashboard → Product → Pricing.`
    );
  }

  return price.id;
}
