import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

/**
 * Anthropic keys are `sk-ant-…`; anything else is treated as OpenAI's own.
 * Both providers use an `sk-` prefix, so the discriminator has to be the
 * longer one.
 */
const usingAnthropic = !!apiKey?.startsWith("sk-ant-");

/**
 * The Recipe Bot's model client.
 *
 * Anthropic serves an OpenAI-compatible Chat Completions API, so the same SDK
 * and the same route work against either provider — only the base URL and the
 * model id change. Which one is in play is decided by the key in
 * `OPENAI_API_KEY`, so switching providers is a `.env` edit and a restart,
 * with no code change.
 *
 * The variable keeps its name because it is what every deployment of this app
 * already sets, and `lib/openai.ts` is the one place that has to care.
 */
export const openai = new OpenAI({
  apiKey,
  ...(usingAnthropic ? { baseURL: "https://api.anthropic.com/v1/" } : {}),
});

/** Matched to whichever key is configured — a mismatch is a 404 from the API. */
export const CHAT_MODEL = usingAnthropic
  ? "claude-haiku-4-5-20251001"
  : "gpt-4o-mini";

/** Named in logs and in the 503 an operator has to diagnose. */
export const CHAT_PROVIDER = usingAnthropic ? "Anthropic" : "OpenAI";

// An unset or unrecognised key fails identically at request time — a bare 401,
// surfaced to the user as "Recipe Bot isn't set up correctly". Name it here
// instead of leaving it to be diagnosed three layers later.
if (!apiKey) {
  console.error(
    "OPENAI_API_KEY is not set. The Recipe Bot will answer 503 to every message."
  );
} else if (!apiKey.startsWith("sk-")) {
  console.error(
    "OPENAI_API_KEY does not look like an OpenAI (sk-proj-…) or Anthropic " +
      "(sk-ant-…) key. The Recipe Bot will answer 503 to every message."
  );
}
