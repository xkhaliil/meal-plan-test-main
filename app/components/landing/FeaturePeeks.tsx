import Image from "next/image";
import ChefLogo from "@/app/components/ChefLogo";

/**
 * Glimpses of the app for the landing page's feature cards, in WeekMockup's
 * idiom: built in HTML, with real content, and hidden from assistive tech —
 * each card's own text says what the feature does.
 *
 * The content is the seeded catalog's: its recipes, times and cuisines, and
 * a stretch of the shopping list that WeekMockup's week produces (94 items
 * from its 17 meals, in the app's order, amounts listed rather than summed).
 */

/**
 * A panel of the app set into the top of a card, running off its right edge
 * and fading out at the bottom, so it reads as a window onto more.
 */
function Peek({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative h-64 select-none overflow-hidden border-b border-zinc-100 bg-zinc-50"
    >
      <div className="absolute bottom-0 left-6 right-0 top-6 rounded-tl-2xl border-l border-t border-zinc-200 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(24,24,27,0.25)]">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-zinc-50/0 to-zinc-50" />
    </div>
  );
}

const RECIPES = [
  { slug: "miso-ramen", title: "Miso Ramen", meta: "65 min · Japanese" },
  {
    slug: "pasta-carbonara",
    title: "Pasta Carbonara",
    meta: "30 min · Italian",
  },
  { slug: "greek-salad", title: "Greek Salad", meta: "15 min · Greek" },
  { slug: "tom-yum-soup", title: "Tom Yum Soup", meta: "35 min · Thai" },
];

const CUISINES = ["All", "Italian", "Japanese", "Thai", "Greek"];

export function RecipesPeek() {
  return (
    <Peek>
      <div className="flex h-8 items-center gap-2 rounded-full border border-zinc-200 px-3 text-xs text-zinc-400">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <circle
            cx="7"
            cy="7"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m10.5 10.5 3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Search recipes
      </div>

      {/* Runs on past the panel's padding, off the card's edge. */}
      <div className="-mr-4 mt-3 flex gap-1.5 overflow-hidden whitespace-nowrap text-[11px]">
        {CUISINES.map((cuisine, i) => (
          <span
            key={cuisine}
            className={
              i === 0
                ? "rounded-full bg-zinc-900 px-2.5 py-1 font-medium text-white"
                : "rounded-full border border-zinc-200 px-2.5 py-1 text-zinc-500"
            }
          >
            {cuisine}
          </span>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {RECIPES.map((recipe) => (
          <li
            key={recipe.slug}
            className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-1.5 pr-3"
          >
            <Image
              src={`/images/plates/${recipe.slug}.jpg`}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-zinc-900">
                {recipe.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                {recipe.meta}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Peek>
  );
}

const LIST = [
  { name: "Garam masala", amounts: "2 tsp", ticked: true },
  {
    name: "Garlic",
    amounts: "2 cloves · 4 cloves · 3 cloves · 4 cloves",
    ticked: false,
  },
  { name: "Ginger", amounts: "1 inch · 1 tbsp · 1 inch", ticked: false },
  { name: "Granola", amounts: "0.5 cup", ticked: true },
  { name: "Greek yogurt", amounts: "2 cups", ticked: false },
  { name: "Green onions", amounts: "4 stalks", ticked: false },
];

export function ListPeek() {
  return (
    <Peek>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-zinc-900">Shopping list</p>
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">
          2 of 94 ticked
        </p>
      </div>

      <ul className="mt-3 divide-y divide-zinc-100 border-t border-zinc-100">
        {LIST.map((item) => (
          <li key={item.name} className="flex items-start gap-2.5 py-2">
            <span
              className={
                item.ticked
                  ? "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-zinc-900 bg-zinc-900 text-[9px] text-white"
                  : "mt-px h-4 w-4 shrink-0 rounded-[5px] border border-zinc-300"
              }
            >
              {item.ticked ? "✓" : ""}
            </span>
            <span className="min-w-0">
              <span
                className={
                  item.ticked
                    ? "block text-xs leading-tight text-zinc-400 line-through"
                    : "block text-xs leading-tight text-zinc-900"
                }
              >
                {item.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                {item.amounts}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Peek>
  );
}

export function ChefPeek() {
  return (
    <Peek>
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-zinc-900 px-3.5 py-2.5 text-xs leading-snug text-white">
          Turn the leftover rice and two eggs into dinner for two.
        </p>
      </div>

      <div className="mt-4 flex gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white">
          <ChefLogo size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-xs leading-snug text-zinc-700">
            Egg fried rice, on the table in fifteen minutes. It&apos;s in your
            recipes.
          </p>

          <div className="relative mt-4">
            <span className="absolute -top-2 left-3 rounded-full bg-emerald-600 px-2 py-px text-[9px] font-medium uppercase tracking-[0.15em] text-white">
              Order up
            </span>
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 pb-2.5 pt-3.5 shadow-[0_8px_24px_-12px_rgba(24,24,27,0.18)]">
              <p className="text-[13px] font-semibold text-zinc-900">
                Egg Fried Rice
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                15 min · Serves 2
              </p>
            </div>
          </div>
        </div>
      </div>
    </Peek>
  );
}
