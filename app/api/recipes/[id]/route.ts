import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: true,
      user: { select: { name: true, email: true } },
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

  const body = await req.json();

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      servings: body.servings,
      calories: body.calories,
      cuisine: body.cuisine,
      dietaryTags: body.dietaryTags,
    },
  });

  return NextResponse.json({ recipe });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  await prisma.mealPlanRecipe.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
