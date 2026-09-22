import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateRecipeInput } from "@/lib/recipeInput";

export async function GET() {
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
