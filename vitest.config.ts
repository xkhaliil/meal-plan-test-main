import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // lib/auth.ts throws at import time without this, which would take down
    // any test that touches a route handler.
    env: { JWT_SECRET: "test-secret-not-used-for-signing" },
  },
  resolve: {
    // Mirrors the "@/*" path alias from tsconfig.json.
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
