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

/**
 * One scheduled meal on a plan. Both the plan and the entry are checked: an
 * entry id from someone else's plan must not be movable or removable just
 * because the caller owns the plan named in the path.
 */
async function loadOwnedEntry(
  req: NextRequest,
  planId: string,
  entryId: string
) {
  const session = getUserFromRequest(req);
  if (!session) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!mealPlan) {
    return {
      error: NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      ),
    };
  }
  if (mealPlan.userId !== session.userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const entry = await prisma.mealPlanRecipe.findUnique({
    where: { id: entryId },
  });
  if (!entry || entry.mealPlanId !== planId) {
    return {
      error: NextResponse.json({ error: "Meal not found" }, { status: 404 }),
    };
  }

  return { entry };
}

/** Move a scheduled meal to another day or meal slot. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const owned = await loadOwnedEntry(req, id, entryId);
  if (owned.error) return owned.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { day, mealType } = body as { day?: unknown; mealType?: unknown };
  const data: { day?: string; mealType?: string } = {};

  if (day !== undefined) {
    if (typeof day !== "string" || !DAYS.includes(day)) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }
    data.day = day;
  }
  if (mealType !== undefined) {
    if (typeof mealType !== "string" || !MEAL_TYPES.includes(mealType)) {
      return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
    }
    data.mealType = mealType;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const mealPlanRecipe = await prisma.mealPlanRecipe.update({
    where: { id: entryId },
    data,
    include: { recipe: true },
  });

  return NextResponse.json({ mealPlanRecipe });
}

/** Take a meal off the plan. The recipe stays in the catalog. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const owned = await loadOwnedEntry(req, id, entryId);
  if (owned.error) return owned.error;

  await prisma.mealPlanRecipe.delete({ where: { id: entryId } });
  return NextResponse.json({ success: true });
}
