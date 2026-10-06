/**
 * The hand-over between the fruit transition and the page it opens with a
 * full page load (see app/components/motion/FruitTransition.tsx).
 *
 * Just before navigating, the transition leaves `ARRIVE_KEY` in session
 * storage. The new page's <head> runs `ARRIVAL_SCRIPT` before its first
 * paint; finding the key, it puts `ARRIVING` on <html>, which shows the
 * transition's arrival panel at once — so the dark panel the old page ended
 * on is the first thing the new one shows, until it is lifted. Kept out of
 * the client component so the root layout, a server component, can read it.
 */
export const ARRIVE_KEY = "mealplan:arrive";

/** Also spelled out in FruitTransition's `[html.mp-arriving_&]` variant. */
export const ARRIVING = "mp-arriving";

export const ARRIVAL_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  ARRIVE_KEY
)}))document.documentElement.classList.add(${JSON.stringify(
  ARRIVING
)})}catch(e){}`;
