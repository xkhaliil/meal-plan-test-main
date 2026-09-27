import {
  NETWORK_ERROR_MESSAGE,
  messageForFailedResponse,
} from "@/lib/apiMessage";

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: string; status: number | null };

/**
 * A fetch that never throws.
 *
 * Every mutation in the app used a bare `await fetch(...)`. A rejected fetch —
 * no network, a function that never answers, a request cancelled mid-flight —
 * escaped as an exception, and whether anything was shown to the reader
 * depended on whether that particular click handler happened to have a
 * `try`/`catch`. Most didn't, so the button went quiet and the page looked
 * broken for no stated reason.
 *
 * Failure is a value here instead: callers branch on `ok`, and the error is
 * always something worth reading.
 */
export async function requestJson<T = unknown>(
  url: string,
  init: RequestInit,
  fallback: string
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE, status: null };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: await messageForFailedResponse(res, fallback),
      status: res.status,
    };
  }

  // A body that isn't JSON is fine on success — several routes answer with
  // nothing useful, and no caller should have to guard for it.
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: true, data };
}
