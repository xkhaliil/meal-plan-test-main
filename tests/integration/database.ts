/**
 * Where the integration project's throwaway database lives.
 *
 * Shared by `vitest.config.ts`, which uses it to decide whether the project can
 * run at all, and by `globalSetup.ts`, which builds and tears down the schema.
 */

/** Is this a Postgres URL pointing at this machine? */
function isLocal(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      (protocol === "postgres:" || protocol === "postgresql:") &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "")
    );
  } catch {
    return false;
  }
}

/**
 * `TEST_DATABASE_URL` if set, otherwise the development database — but only
 * when that is plainly local.
 *
 * These tests create a schema and drop it again. Doing that against whatever
 * hosted database a developer happens to be pointed at, because `DATABASE_URL`
 * was inherited from `.env`, is not a mistake worth leaving available.
 */
export function resolveTestDatabaseUrl(): string | null {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  if (explicit) return explicit;

  const dev = process.env.DATABASE_URL?.trim();
  return dev && isLocal(dev) ? dev : null;
}

/** The same connection, aimed at one named schema. */
export function withSchema(url: string, schema: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("schema", schema);
  return parsed.toString();
}

export const NO_DATABASE_MESSAGE =
  "Integration tests need a Postgres database. Set TEST_DATABASE_URL (or point " +
  "DATABASE_URL at a local Postgres) — see README → Testing.";
