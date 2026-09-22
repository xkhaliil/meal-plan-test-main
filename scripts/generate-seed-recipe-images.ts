import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { generateImagenImageBuffer } from "../lib/nanoBanana";

const FOOD_STYLE =
  "Professional food photography for a high-end cookbook app, 100mm macro lens, " +
  "controlled soft studio lighting, shallow depth of field, appetizing steam where appropriate, " +
  "sharp focus on the dish, no text, no watermark, no people, no hands.";

type SeedRecipeImage = {
  file: string;
  title: string;
  description: string;
  cuisine: string;
};

const RECIPES: SeedRecipeImage[] = [
  {
    file: "classic-pancakes.jpg",
    title: "Classic Pancakes",
    description:
      "Fluffy buttermilk pancakes, golden brown stack with maple syrup and butter.",
    cuisine: "American",
  },
  {
    file: "grilled-salmon.jpg",
    title: "Grilled Salmon",
    description:
      "Cedar plank grilled salmon fillet with honey-mustard glaze, lemon wedge.",
    cuisine: "American",
  },
  {
    file: "caesar-salad.jpg",
    title: "Caesar Salad",
    description:
      "Crisp romaine Caesar salad with shaved parmesan, croutons, creamy dressing in a bowl.",
    cuisine: "Italian",
  },
  {
    file: "beef-stew.jpg",
    title: "Beef Stew",
    description:
      "Hearty beef stew in a deep bowl with tender beef chunks, potatoes, carrots, rich broth.",
    cuisine: "American",
  },
  {
    file: "chicken-tikka.jpg",
    title: "Chicken Tikka Masala",
    description:
      "Creamy orange chicken tikka masala in a bowl with basmati rice and cilantro garnish.",
    cuisine: "Indian",
  },
  {
    file: "pasta-carbonara.jpg",
    title: "Pasta Carbonara",
    description:
      "Roman spaghetti carbonara with guanciale, black pepper, pecorino, twirled on a fork.",
    cuisine: "Italian",
  },
  {
    file: "veggie-stir-fry.jpg",
    title: "Veggie Stir Fry",
    description:
      "Colorful wok stir-fry with broccoli, bell peppers, snap peas, glossy soy-ginger sauce.",
    cuisine: "Chinese",
  },
  {
    file: "chocolate-cake.jpg",
    title: "Chocolate Cake",
    description:
      "Rich chocolate layer cake slice with dark chocolate ganache frosting on a plate.",
    cuisine: "American",
  },
  {
    file: "french-toast.jpg",
    title: "French Toast",
    description:
      "Thick French toast with cinnamon, powdered sugar, fresh berries, maple syrup drizzle.",
    cuisine: "French",
  },
  {
    file: "mushroom-risotto.jpg",
    title: "Mushroom Risotto",
    description:
      "Creamy mushroom risotto in a shallow bowl, parmesan shavings, wild mushrooms on top.",
    cuisine: "Italian",
  },
  {
    file: "fish-tacos.jpg",
    title: "Fish Tacos",
    description:
      "Baja-style fish tacos on corn tortillas with crispy fish, cabbage slaw, lime crema.",
    cuisine: "Mexican",
  },
  {
    file: "banana-smoothie.jpg",
    title: "Banana Smoothie",
    description:
      "Thick banana peanut butter smoothie in a tall glass, creamy texture, straw optional.",
    cuisine: "American",
  },
  {
    file: "greek-salad.jpg",
    title: "Greek Salad",
    description:
      "Horiatiki-style salad with tomato, cucumber, red onion, kalamata olives, feta block.",
    cuisine: "Greek",
  },
  {
    file: "pulled-pork.jpg",
    title: "Pulled Pork",
    description:
      "Slow-smoked pulled pork piled on a plate with tangy BBQ sauce, pickle garnish.",
    cuisine: "American",
  },
  {
    file: "avocado-toast.jpg",
    title: "Avocado Toast",
    description:
      "Smashed avocado on toasted sourdough with everything seasoning and a poached egg.",
    cuisine: "American",
  },
  {
    file: "tom-yum-soup.jpg",
    title: "Tom Yum Soup",
    description:
      "Tom yum goong in a bowl, shrimp, mushrooms, lemongrass, aromatic red broth.",
    cuisine: "Thai",
  },
  {
    file: "berry-parfait.jpg",
    title: "Berry Parfait",
    description:
      "Layered Greek yogurt parfait in a glass with mixed berries, granola, honey drizzle.",
    cuisine: "American",
  },
  {
    file: "lamb-curry.jpg",
    title: "Lamb Curry",
    description:
      "Rich lamb curry with tender meat in spiced tomato-coconut sauce, cilantro, basmati rice.",
    cuisine: "Indian",
  },
  {
    file: "caprese-sandwich.jpg",
    title: "Caprese Sandwich",
    description:
      "Ciabatta caprese sandwich with fresh mozzarella, tomato slices, basil, balsamic glaze.",
    cuisine: "Italian",
  },
  {
    file: "miso-ramen.jpg",
    title: "Miso Ramen",
    description:
      "Miso ramen bowl with wheat noodles, soft-boiled egg, chashu pork, nori, green onion.",
    cuisine: "Japanese",
  },
];

function buildPrompt(r: SeedRecipeImage): string {
  return (
    `A photo of ${r.title}: ${r.description} ` +
    `${r.cuisine} style presentation. ${FOOD_STYLE}`
  );
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "images", "recipes");
  fs.mkdirSync(outDir, { recursive: true });

  let done = 0;
  for (const r of RECIPES) {
    const prompt = buildPrompt(r);
    process.stdout.write(`[${++done}/${RECIPES.length}] ${r.file} … `);
    const buf = await generateImagenImageBuffer({
      prompt,
      aspectRatio: "4:3",
      imageSize: "2K",
      mimeType: "image/jpeg",
      jpegQuality: 92,
    });
    const dest = path.join(outDir, r.file);
    fs.writeFileSync(dest, buf);
    const mb = (buf.length / (1024 * 1024)).toFixed(2);
    console.log(`OK (${mb} MB)`);
    await new Promise((res) => setTimeout(res, 600));
  }
  console.log("Done. Files written to public/images/recipes/");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
