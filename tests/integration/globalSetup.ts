import { execSync } from "child_process";
import { randomBytes } from "crypto";
import {
  NO_DATABASE_MESSAGE,
  resolveTestDatabaseUrl,
  withSchema,
} from "./database";

/**
 * Builds a throwaway Postgres schema for the integration project.
 *
 * These tests run the real route handlers against real Prisma, so they need a
 * real database — but never the development one. Each run gets its own schema,
 * created from `prisma/schema.prisma` and dropped afterwards, so a failing test
 * can't leave state behind that makes the next run pass (or fail) for the wrong
 * reason, and two runs can share a server without colliding.
 *
 * It was a throwaway SQLite file until the app moved to Postgres for Vercel.
 * Testing against the engine production uses is the point: case sensitivity,
 * transaction semantics and constraint errors all differ between the two.
 */
export default function setup() {
  const base = resolveTestDatabaseUrl();
  if (!base) throw new Error(NO_DATABASE_MESSAGE);

  const schema = "test_" + randomBytes(5).toString("hex");
  const url = withSchema(base, schema);

  // `db push` creates the schema when it isn't there.
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  // Workers are forked after this returns, so they inherit the URL.
  process.env.DATABASE_URL = url;

  return () => {
    try {
      execSync(`npx prisma db execute --url "${url}" --stdin`, {
        input: `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      // Worth saying out loud: the schema is named `test_…`, so a leftover is
      // easy to find, but silently accumulating them is not.
      console.error(`Could not drop test schema ${schema}:`, err);
    }
  };
}
