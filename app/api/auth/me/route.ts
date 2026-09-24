import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getUserFromRequest, signToken, clearAuthCookie } from "@/lib/auth";

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  plan: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: PUBLIC_FIELDS,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

/**
 * Update the signed-in account.
 *
 * A name change is harmless, but changing the address you sign in with — or
 * the password itself — has to be proved with the current password, or anyone
 * borrowing an unlocked browser could take the account over.
 */
export async function PATCH(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  const { name, email, currentPassword, newPassword } = body as {
    name?: unknown;
    email?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: { name?: string; email?: string; password?: string } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }

  const wantsNewEmail =
    typeof email === "string" && email.trim() && email.trim() !== user.email;
  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (wantsNewEmail) data.email = email.trim();
  }

  if (newPassword !== undefined) {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (data.email || data.password) {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json(
        {
          error: "Enter your current password to change your email or password",
        },
        { status: 400 }
      );
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return NextResponse.json(
        { error: "That password doesn't match this account" },
        { status: 403 }
      );
    }
  }

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: PUBLIC_FIELDS,
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
    }
    throw err;
  }

  // The signed token carries the address it was issued for; hand back a fresh
  // one so the client isn't left holding a token for an email that's gone.
  return NextResponse.json({
    user: updated,
    token: data.email
      ? signToken({ userId: updated.id, email: updated.email })
      : undefined,
  });
}

/**
 * Delete the account and everything hanging off it.
 *
 * No relation in the schema declares `onDelete: Cascade`, so the dependents
 * come out by hand, deepest first, inside one transaction.
 */
export async function DELETE(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  const { password } = body as { password?: unknown };
  if (typeof password !== "string" || !password) {
    return NextResponse.json(
      { error: "Enter your password to delete this account" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return NextResponse.json(
      { error: "That password doesn't match this account" },
      { status: 403 }
    );
  }

  // Cancel billing before the row disappears — a deleted account with a live
  // subscription would keep charging with nothing left to cancel it from.
  if (user.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      console.error(
        "Failed to cancel subscription before account delete:",
        err
      );
      return NextResponse.json(
        {
          error:
            "Your subscription could not be cancelled, so the account wasn't deleted. Cancel it first, then try again.",
        },
        { status: 502 }
      );
    }
  }

  await prisma.$transaction([
    // Other people's plans can schedule this user's recipes, so those entries
    // go too — not just the ones on their own plans.
    prisma.mealPlanRecipe.deleteMany({
      where: {
        OR: [
          { mealPlan: { userId: user.id } },
          { recipe: { userId: user.id } },
        ],
      },
    }),
    prisma.mealPlan.deleteMany({ where: { userId: user.id } }),
    prisma.ingredient.deleteMany({ where: { recipe: { userId: user.id } } }),
    prisma.recipe.deleteMany({ where: { userId: user.id } }),
    prisma.chatMessage.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  // The account is gone; the session cookie must go with it.
  return clearAuthCookie(NextResponse.json({ success: true }));
}
