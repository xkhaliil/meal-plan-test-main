import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
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
  if (
    typeof body.mealType !== "string" ||
    !MEAL_TYPES.includes(body.mealType)
  ) {
    return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
  }
  if (typeof body.recipeId !== "string" || !body.recipeId) {
    return NextResponse.json(
      { error: "recipeId is required" },
      { status: 400 }
    );
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: body.recipeId },
  });
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

/** Rename a plan or move it to different dates. */
export async function PUT(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { name, startDate, endDate } = body as {
    name?: unknown;
    startDate?: unknown;
    endDate?: unknown;
  };

  const data: { name?: string; startDate?: Date; endDate?: Date } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }

  for (const [key, value] of [
    ["startDate", startDate],
    ["endDate", endDate],
  ] as const) {
    if (value === undefined) continue;
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      return NextResponse.json(
        { error: `${key} must be a valid date` },
        { status: 400 }
      );
    }
    data[key] = new Date(value);
  }

  // Whichever side wasn't sent keeps its stored value, so the range is checked
  // against what the plan will actually be.
  const start = data.startDate ?? mealPlan.startDate;
  const end = data.endDate ?? mealPlan.endDate;
  if (end.getTime() <= start.getTime()) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 400 }
    );
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.mealPlan.update({ where: { id }, data });
  return NextResponse.json({ mealPlan: updated });
}

/** Delete the plan and the meals scheduled on it. The recipes themselves stay. */
export async function DELETE(
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

  // No onDelete: Cascade in the schema, so the entries come out first.
  await prisma.$transaction([
    prisma.mealPlanRecipe.deleteMany({ where: { mealPlanId: id } }),
    prisma.mealPlan.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
