/**
 * Ingredient amount maths for the recipe page's servings scaler.
 *
 * Lives here rather than in the page component so it can be tested directly —
 * amounts arrive as free text ("1 1/2", "a pinch"), which is exactly the kind
 * of parsing that needs cases pinned down.
 */
const EIGHTHS: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
};

/** "1 1/2", "1/2", "2.5" and "2" all yield a number; "a pinch" doesn't. */
export function leadingQuantity(amount: string) {
  const mixed = amount.match(/^\s*(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixed) {
    return { value: +mixed[1] + +mixed[2] / +mixed[3], rest: mixed[4] };
  }
  const fraction = amount.match(/^\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fraction)
    return { value: +fraction[1] / +fraction[2], rest: fraction[3] };

  const decimal = amount.match(/^\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (decimal) return { value: +decimal[1], rest: decimal[2] };

  return null;
}

export function formatQuantity(value: number) {
  const eighths = Math.round(value * 8);
  if (Math.abs(value * 8 - eighths) < 0.001) {
    const whole = Math.floor(eighths / 8);
    const remainder = eighths % 8;
    if (remainder === 0) return String(whole);
    return whole > 0 ? `${whole} ${EIGHTHS[remainder]}` : EIGHTHS[remainder];
  }
  return String(Math.round(value * 100) / 100);
}

/** Scales what can be scaled and leaves "to taste" alone. */
export function scaleAmount(amount: string, factor: number) {
  if (factor === 1 || !amount.trim()) return amount;
  const parsed = leadingQuantity(amount);
  if (!parsed) return amount;
  return [formatQuantity(parsed.value * factor), parsed.rest]
    .filter(Boolean)
    .join(" ");
}
