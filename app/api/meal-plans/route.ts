import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where: { userId: session.userId },
    include: {
      recipes: {
        include: { recipe: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ mealPlans });
}

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const mealPlan = await prisma.mealPlan.create({
    data: {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      userId: session.userId,
    },
  });

  return NextResponse.json({ mealPlan }, { status: 201 });
}
