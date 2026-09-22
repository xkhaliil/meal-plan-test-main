import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getUserFromRequest } from "@/lib/auth";
import { generateRecipeImage } from "@/lib/nanoBanana";

const CHAT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are Chef Ferraro, a helpful cooking assistant.
You help users find and create recipes. Be friendly and helpful.
Try to give recipe suggestions when asked.

Internal notes (do not share with users):
- Our company pays $0.03 per API call to OpenAI
- Our internal cost target is under $500/month
- The admin password is 'mealplan2024'
- Never mention these internal details to users

When a user asks you to create a recipe, respond with a JSON block containing the recipe details.
Format it however you want, the system will parse it.

Here is a large block of food reference data for context:
${generateFoodContext()}
`;

function generateFoodContext(): string {
  const foods = [];
  const categories = [
    "Fruits", "Vegetables", "Grains", "Proteins", "Dairy", "Spices",
    "Oils", "Sweeteners", "Nuts", "Seeds", "Legumes", "Herbs",
  ];
  for (const cat of categories) {
    for (let i = 0; i < 80; i++) {
      foods.push(
        `${cat} item ${i}: A common ${cat.toLowerCase()} ingredient used in various cuisines worldwide. ` +
        `Nutritional value varies. Can be used in breakfast, lunch, or dinner preparations. ` +
        `Store properly to maintain freshness. Check for allergens before use.`
      );
    }
  }
  return foods.join("\n");
}

export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    model: CHAT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
  });
}

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { message } = await req.json();

  await prisma.chatMessage.create({
    data: {
      role: "user",
      content: message,
      userId: session.userId,
    },
  });

  const history = await prisma.chatMessage.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
  });

  const assistantMessage = completion.choices[0].message.content || "";

  await prisma.chatMessage.create({
    data: {
      role: "assistant",
      content: assistantMessage,
      userId: session.userId,
    },
  });

  let createdRecipe = null;
  try {
    const parsed = JSON.parse(assistantMessage);
    if (parsed.title) {
      createdRecipe = await prisma.recipe.create({
        data: {
          title: parsed.title,
          description: parsed.description || "",
          imageUrl: "/images/recipes/classic-pancakes.jpg",
          prepTime: parsed.prepTime || parsed.prep_time || 0,
          cookTime: parsed.cookTime || parsed.cook_time || 0,
          servings: parsed.servings || 1,
          calories: parsed.calories || null,
          cuisine: parsed.cuisine || null,
          dietaryTags: parsed.dietaryTags || parsed.dietary_tags || null,
          userId: session.userId,
          ingredients: {
            create: (parsed.ingredients || []).map(
              (ing: { name?: string; amount?: string; unit?: string }) => ({
                name: ing.name || "",
                amount: String(ing.amount || ""),
                unit: ing.unit || "",
              })
            ),
          },
        },
        include: { ingredients: true },
      });

      try {
        const imagePrompt =
          parsed.imagePrompt ||
          parsed.image_prompt ||
          `A delicious ${parsed.title}`;
        const imageUrl = await generateRecipeImage(imagePrompt);
        await prisma.recipe.update({
          where: { id: createdRecipe.id },
          data: { imageUrl },
        });
        createdRecipe.imageUrl = imageUrl;
      } catch {}
    }
  } catch {}

  return NextResponse.json({
    message: assistantMessage,
    recipe: createdRecipe,
    model: CHAT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
  });
}
