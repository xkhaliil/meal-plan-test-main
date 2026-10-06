/**
 * The handshake between the landing intro and the hero underneath it.
 *
 * The hero's entrance has to start as the intro's panel lifts — not on
 * mount, when it is still hidden — and immediately when there is no intro at
 * all (reduced motion, a second visit in the same page load). Module state,
 * so it survives the two components mounting in either order.
 */

type Listener = () => void;

let revealed = false;
const listeners = new Set<Listener>();

/** Called by the intro when the hero should start showing. */
export function announceReveal() {
  if (revealed) return;
  revealed = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

/** Runs `listener` once the hero may reveal — right away if it already can. */
export function onReveal(listener: Listener): () => void {
  if (revealed) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
