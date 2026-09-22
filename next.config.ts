import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parent folder also has package-lock.json; Turbopack would pick GitHub/ and fail to resolve tailwindcss.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
