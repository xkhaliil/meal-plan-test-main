import { defineConfig } from "vitest/config";
import path from "path";
import {
  NO_DATABASE_MESSAGE,
  resolveTestDatabaseUrl,
} from "./tests/integration/database";

const alias = { "@": path.resolve(__dirname, ".") };

/**
 * The integration project needs a Postgres it may create and drop a schema in.
 * Without one it is left out of the run rather than failing it, so `npm test`
 * still does something useful on a machine with no database — CI always sets
 * TEST_DATABASE_URL, so nothing goes unchecked there.
 */
const testDatabaseUrl = resolveTestDatabaseUrl();
if (!testDatabaseUrl) {
  console.warn(
    "[vitest] Skipping the integration project. " + NO_DATABASE_MESSAGE
  );
}

const integrationProject = {
  resolve: { alias },
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/globalSetup.ts"],
    // DATABASE_URL is deliberately absent: globalSetup picks the schema name
    // and exports the URL before the workers are forked.
    env: { JWT_SECRET: "test-secret-not-used-for-signing" },
    // These share one schema, so they must not run in parallel with each
    // other. `fileParallelism` is root-only, so the project pins itself to a
    // single fork instead.
    poolOptions: { forks: { singleFork: true } },
  },
};

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
      ...(testDatabaseUrl ? [integrationProject] : []),
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
