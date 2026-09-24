import { defineConfig } from "vitest/config";
import path from "path";

/** One temp SQLite file for the integration project, created by its setup. */
export const INTEGRATION_DB = path.resolve(
  __dirname,
  "tests/.tmp/integration.db"
);

const alias = { "@": path.resolve(__dirname, ".") };

/**
 * Three vitest projects, so each layer can have the environment it needs and
 * be run on its own (`npm run test:unit`, `:integration`, `:component`).
 * End-to-end lives outside vitest, in Playwright.
 */
export default defineConfig({
  resolve: { alias },
  // tsconfig says `jsx: react-jsx`, and esbuild honours it — which is why no
  // React plugin is needed here (and @vitejs/plugin-react wants a newer Vite
  // than vitest 3 ships).
  esbuild: { jsx: "automatic" },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: [
            "lib/__tests__/**/*.test.ts",
            "app/api/__tests__/**/*.test.ts",
          ],
          // lib/auth.ts throws at import without it.
          env: { JWT_SECRET: "test-secret-not-used-for-signing" },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/globalSetup.ts"],
          // Real Prisma against a throwaway database. An absolute URL because
          // Prisma resolves a relative `file:` against prisma/, not the cwd.
          env: {
            JWT_SECRET: "test-secret-not-used-for-signing",
            DATABASE_URL: `file:${INTEGRATION_DB}`,
          },
          // These share one database file, so they must not run in parallel
          // with each other. `fileParallelism` is root-only, so the project
          // pins itself to a single fork instead.
          poolOptions: { forks: { singleFork: true } },
        },
      },
      {
        resolve: { alias },
        esbuild: { jsx: "automatic" },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          setupFiles: ["tests/component/setup.ts"],
        },
      },
    ],
  },
});
