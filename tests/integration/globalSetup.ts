import { execSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "tests/.tmp/integration.db");
const DB_URL = `file:${DB_PATH}`;

/**
 * Builds a throwaway SQLite database for the integration project.
 *
 * These tests run the real route handlers against real Prisma, so they need a
 * real schema — but never the development database. The file is recreated from
 * scratch on every run, so a failing test can't leave state behind that makes
 * the next run pass (or fail) for the wrong reason.
 */
export default function setup() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  rmSync(DB_PATH, { force: true });

  // No --force-reset: the file is deleted just above, so a plain push creates
  // it from scratch. (--force-reset is also gated behind a destructive-action
  // prompt, which has no place in a test run.)
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: DB_URL },
    stdio: "pipe",
  });

  return () => {
    rmSync(DB_PATH, { force: true });
  };
}
