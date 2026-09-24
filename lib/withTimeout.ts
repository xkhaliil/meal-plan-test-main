/**
 * Caps how long an upstream call may take.
 *
 * Neither the chat completion nor the image generation had any bound, so a
 * hanging provider held the request (and the user's spinner) open indefinitely.
 * The underlying call isn't cancelled — that needs per-SDK abort support — but
 * the route stops waiting and can answer.
 */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}
