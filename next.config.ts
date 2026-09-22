import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parent folder also has package-lock.json; Turbopack would pick GitHub/ and fail to resolve tailwindcss.
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    STRIPE_RESTRICTED_KEY: process.env.STRIPE_RESTRICTED_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRO_PRODUCT_ID: process.env.STRIPE_PRO_PRODUCT_ID,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;
