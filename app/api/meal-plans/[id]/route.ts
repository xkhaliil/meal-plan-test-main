import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id },
    include: {
      recipes: {
        include: { recipe: { include: { ingredients: true } } },
      },
    },
  });

  if (!mealPlan) {
    return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  }

  return NextResponse.json({ mealPlan });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const firstRecipe = await prisma.recipe.findFirst({ orderBy: { createdAt: "asc" } });

  const mealPlanRecipe = await prisma.mealPlanRecipe.create({
    data: {
      day: body.day,
      mealType: body.mealType,
      recipeId: firstRecipe!.id,
      mealPlanId: id,
    },
    include: { recipe: true },
  });

  return NextResponse.json({ mealPlanRecipe }, { status: 201 });
}
