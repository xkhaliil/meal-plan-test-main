import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parent folder also has package-lock.json; Turbopack would pick GitHub/ and fail to resolve tailwindcss.
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    /**
     * Every `next/image` is served as authored, with no resizing, no format
     * conversion and no trip through Vercel's optimizer — so no image
     * transformations are billed and no `remotePatterns` allowlist is needed
     * for a remote src.
     *
     * The trade is that the browser downloads the file at its natural size, so
     * anything added to `public/` should already be sized for its slot.
     */
    unoptimized: true,
  },
};

export default nextConfig;
