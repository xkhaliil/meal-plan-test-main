import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateRecipeInput } from "@/lib/recipeInput";

/**
 * The catalog.
 *
 * Shared across accounts by design — the seed library belongs to alice, and
 * scoping reads to the owner would leave every other account empty. Writes stay
 * owner-checked. It does require a session: this used to serve every user's
 * recipes to anonymous callers.
 *
 * `?view=` keeps callers from pulling the whole library when they don't need
 * it. The settings page wanted two numbers and the meal-plan pickers want
 * id/title pairs; both used to download every recipe with all its ingredients.
 */
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view");

  if (view === "summary") {
    const [total, mine] = await Promise.all([
      prisma.recipe.count(),
      prisma.recipe.count({ where: { userId: session.userId } }),
    ]);
    return NextResponse.json({ total, mine });
  }

  if (view === "options") {
    const recipes = await prisma.recipe.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
    return NextResponse.json({ recipes });
  }

  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ recipes });
}

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const validated = validateRecipeInput(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const recipe = await prisma.recipe.create({
    data: {
      title: validated.title!,
      description: validated.description!,
      imageUrl:
        typeof body.imageUrl === "string" && body.imageUrl.trim()
          ? body.imageUrl.trim()
          : "/images/recipes/classic-pancakes.jpg",
      prepTime: validated.prepTime!,
      cookTime: validated.cookTime!,
      servings: validated.servings!,
      calories: validated.calories ?? null,
      cuisine: validated.cuisine ?? null,
      dietaryTags: validated.dietaryTags ?? null,
      userId: session.userId,
      ingredients: {
        create: validated.ingredients!,
      },
    },
    include: { ingredients: true },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
