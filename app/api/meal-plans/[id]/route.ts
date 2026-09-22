import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

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
  if (mealPlan.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });
  if (!mealPlan) {
    return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  }
  if (mealPlan.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (typeof body.day !== "string" || !DAYS.includes(body.day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  if (typeof body.mealType !== "string" || !MEAL_TYPES.includes(body.mealType)) {
    return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
  }
  if (typeof body.recipeId !== "string" || !body.recipeId) {
    return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: body.recipeId } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const mealPlanRecipe = await prisma.mealPlanRecipe.create({
    data: {
      day: body.day,
      mealType: body.mealType,
      recipeId: recipe.id,
      mealPlanId: id,
    },
    include: { recipe: true },
  });

  return NextResponse.json({ mealPlanRecipe }, { status: 201 });
}
