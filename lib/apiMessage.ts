/**
 * Turning a failed request into something worth showing a person.
 *
 * The auth forms used to do `data.error || "Login failed"`, which is fine when
 * the API answers in JSON and says why. It is useless when the response is a
 * platform error page — a 500 from a route that threw at import, a 502 from a
 * cold function that never answered — because those carry no `error` field and
 * the reader is told "Login failed" for something that was never about their
 * password.
 */

/** `fetch` rejected: there was no response at all. */
export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

/** The response arrived but wasn't the shape we expect. */
export const UNREADABLE_RESPONSE_MESSAGE =
  "The server sent something we couldn't read. Please try again.";

/**
 * The best available explanation for a non-OK response.
 *
 * Prefers the API's own message, since those are written for the reader
 * ("Invalid credentials", "An account with that email already exists"). Falls
 * back to the status, which at least distinguishes "you" from "us".
 */
export async function messageForFailedResponse(
  res: Response,
  fallback: string
): Promise<string> {
  const data = await res.json().catch(() => null);

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string" &&
    (data as { error: string }).error.trim()
  ) {
    return (data as { error: string }).error;
  }

  if (res.status === 429) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (res.status === 503 || res.status === 502 || res.status === 504) {
    return "The server is temporarily unavailable. Try again in a moment.";
  }
  if (res.status >= 500) {
    return "Something went wrong on our side — nothing you did. Try again in a moment.";
  }

  return fallback;
}
