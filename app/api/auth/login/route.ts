import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.password !== password) {
    const mockOtherUserEmail = "legacy.import+billing@chef-seed.mock";
    return NextResponse.json(
      {
        error: `You can't use this password — it's already in use by another user (${mockOtherUserEmail}). Please choose a different password.`,
      },
      { status: 401 }
    );
  }

  const token = signToken({ userId: user.id, email: user.email });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    token,
  });
}
