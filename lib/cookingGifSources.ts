/**
 * Cooking GIF backdrop sources (optional large local assets or remote fallbacks).
 *
 * For large assets (~20MB each, optional): either
 * - set NEXT_PUBLIC_COOKING_GIF_URLS to comma-separated HTTPS URLs, or
 * - drop 01.gif … 04.gif into public/cooking-gifs/ and set NEXT_PUBLIC_COOKING_GIF_USE_LOCAL_MEGA=1
 *
 * Without that, smaller remote fallbacks are used so the app still runs from a fresh clone.
 */

/** Slots per page (see `CookingGifBackdrop`). */
export const COOKING_GIF_SLOT_COUNT = 4;

/**
 * Remote fallbacks: every ID is a real cooking / kitchen / baking / meal-prep GIF (Giphy `og:title` checked).
 * Smaller than ~20MB; use env or local mega GIFs for heavier assets.
 */
const FALLBACK_COOKING_GIFS: readonly string[] = [
  "https://media.giphy.com/media/1xbb5fODyfEdtntc0k/giphy.gif", // GMA — kitchen / cutting / food prep
  "https://media.giphy.com/media/hcF73Z7YkMJYXKhMEz/giphy.gif", // GMA — food / cooking / kitchen
  "https://media.giphy.com/media/YP2dN25Qt9yPx3f0dw/giphy.gif", // GMA — kitchen cooking hack
  "https://media.giphy.com/media/zIedOMmnmCDU4/giphy.gif", // Ratatouille — chef cooking
  "https://media.giphy.com/media/7MdjxhX0qxpfy/giphy.gif", // chef / cooking (film)
  "https://media.giphy.com/media/2ysuKksd0rDJuqrv8G/giphy.gif", // chef / kitchen / cooking
  "https://media.giphy.com/media/26BRQXyqJR1cqSaI0/giphy.gif", // MasterChef — pie / cooking
  "https://media.giphy.com/media/JK3vhLwwWhumPKqIMv/giphy.gif", // Great British Bake Off — cake / baking
  "https://media.giphy.com/media/E6oWSwq4laZjEodrRB/giphy.gif", // chef / pancakes / baking
  "https://media.giphy.com/media/xUOxf34pcKzwT4v6x2/giphy.gif", // cuisine / cooking / stir-fry
  "https://media.giphy.com/media/3o6ZtciwXVpWmE9Ko0/giphy.gif", // Food Network — cooking / Emeril
  "https://media.giphy.com/media/l4EoNTdBmurxaOb8Q/giphy.gif", // Ree Drummond — meal prep
];

function padSources(base: readonly string[], count: number): string[] {
  if (base.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(base[i % base.length]!);
  return out;
}

export function getCookingGifSources(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_COOKING_GIF_URLS?.trim();
  if (raw) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return padSources(parts, COOKING_GIF_SLOT_COUNT);
  }
  if (process.env.NEXT_PUBLIC_COOKING_GIF_USE_LOCAL_MEGA === "1") {
    return Array.from({ length: COOKING_GIF_SLOT_COUNT }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `/cooking-gifs/${n}.gif`;
    });
  }
  return padSources(FALLBACK_COOKING_GIFS, COOKING_GIF_SLOT_COUNT);
}
