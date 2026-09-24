"use client";

import { useEffect, useState } from "react";

interface Price {
  amount: number | null;
  currency: string;
  interval: string | null;
}

/**
 * The live Pro price, read from Stripe.
 *
 * Renders the fallback text until it arrives, and keeps it if Stripe is
 * unreachable or the price isn't configured — a pricing section should never
 * be blank, and it should never show a number that isn't what gets charged.
 */
export default function ProPrice({
  className = "",
  fallback = "Billed monthly through Stripe",
}: {
  className?: string;
  fallback?: string;
}) {
  const [price, setPrice] = useState<Price | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stripe/price")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.amount != null) setPrice(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!price || price.amount == null) {
    return <span className={className}>{fallback}</span>;
  }

  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: price.currency,
    // Whole prices read better without the trailing zeros.
    minimumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  }).format(price.amount);

  return (
    <span className={className}>
      {formatted}
      {price.interval ? ` / ${price.interval}` : ""} · cancel anytime
    </span>
  );
}
