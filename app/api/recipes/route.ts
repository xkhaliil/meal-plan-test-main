import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

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

  const recipe = await prisma.recipe.create({
    data: {
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl || "/images/recipes/classic-pancakes.jpg",
      prepTime: body.prepTime || 0,
      cookTime: body.cookTime || 0,
      servings: body.servings || 1,
      calories: body.calories,
      cuisine: body.cuisine,
      dietaryTags: body.dietaryTags,
      userId: session.userId,
      ingredients: {
        create: body.ingredients || [],
      },
    },
    include: { ingredients: true },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
