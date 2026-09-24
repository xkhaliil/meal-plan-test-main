import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { validateRecipeInput } from "@/lib/recipeInput";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: true,
      user: { select: { name: true } },
    },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ recipe });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  if (existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const validated = validateRecipeInput(body, { partial: true });
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      title: validated.title,
      description: validated.description,
      prepTime: validated.prepTime,
      cookTime: validated.cookTime,
      servings: validated.servings,
      calories: validated.calories,
      cuisine: validated.cuisine,
      dietaryTags: validated.dietaryTags,
      // An edited ingredient list replaces the old one wholesale; rows have no
      // stable identity to diff against. Left out entirely, it's untouched.
      ...(validated.ingredients
        ? {
            ingredients: {
              deleteMany: {},
              create: validated.ingredients,
            },
          }
        : {}),
    },
    include: { ingredients: true },
  });

  return NextResponse.json({ recipe });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  if (existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  await prisma.mealPlanRecipe.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
